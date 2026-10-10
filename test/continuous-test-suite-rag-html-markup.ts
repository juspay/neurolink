#!/usr/bin/env tsx
/**
 * RAG HTML-to-text markup removal through actual public SDK exports.
 *
 * WebLoader reads an owned ordinary HTTP document; the legacy HTMLChunker and
 * the public `createChunker("html")` factory each process the same HTML. No
 * internal module is imported. Everything comes from `dist/index.js`.
 *
 * This verifies text conversion: which stretches of the input are treated as
 * markup, and that converting a hostile document stays linear. It is NOT a
 * check of HTML output sanitization. The result is plain text for retrieval
 * and is not safe to write back into a page; a decoded `&lt;b&gt;` is allowed
 * to become `<b>`. Entity decoding itself is covered by
 * continuous-test-suite-rag-entity-decoding.ts and is not repeated here.
 */
import "./helpers/credentialFreeEnv.js";
import { createServer } from "node:http";
import { HTMLChunker, WebLoader, createChunker } from "../dist/index.js";
import { assert, defineSuite, scaleTimeoutMs } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
const { test, runSuite } = defineSuite("RAG HTML markup removal", {
  offline: true,
});

const pages = new Map<string, string>();
const server = createServer((req, res) => {
  const page = pages.get(req.url ?? "");
  res.writeHead(page === undefined ? 404 : 200, {
    "content-type": "text/html; charset=utf-8",
  });
  res.end(page ?? "Missing owned fixture");
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Owned document listener has no TCP address");
}
const origin = `http://127.0.0.1:${address.port}`;
const loader = new WebLoader();
const legacy = new HTMLChunker();
const BIG = 10_000_000;
let routeCount = 0;

async function viaWebLoader(html: string): Promise<string> {
  const route = `/doc-${routeCount++}`;
  pages.set(route, html);
  const document = await loader.load(`${origin}${route}`, { timeout: 20_000 });
  return document.getContent();
}

// The legacy chunker splits on <div>; with no nested split tags in the
// fixtures the whole fixture is one section.
async function viaLegacyChunker(html: string): Promise<string> {
  const chunks = await legacy.chunk(`<div>${html}</div>`, {
    extractTextOnly: true,
    maxSize: BIG,
  });
  return chunks.map((chunk) => chunk.text).join(" ");
}

// minSize 0: the default drops chunks shorter than ten characters, which would
// hide short results.
async function viaFactoryChunker(html: string): Promise<string> {
  const chunker = await createChunker("html", { maxSize: BIG, minSize: 0 });
  const chunks = await chunker.chunk(html);
  return chunks.map((chunk) => chunk.text).join(" ");
}

const converters: ReadonlyArray<
  readonly [name: string, convert: (html: string) => Promise<string>]
> = [
  ["web loader", viaWebLoader],
  ["legacy chunker", viaLegacyChunker],
  ["factory chunker", viaFactoryChunker],
];

// Tags become nothing on the first two paths and a space on the factory path,
// so the same markup reads with different spacing; whitespace is collapsed.
function expectations(
  web: string,
  legacyText: string,
  factory: string,
): ReadonlyMap<string, string> {
  return new Map([
    ["web loader", web],
    ["legacy chunker", legacyText],
    ["factory chunker", factory],
  ]);
}

// Every path is run before the verdict, so one failing run names each path that
// is wrong instead of stopping at the first. The message carries the path names
// only: quoting converted text could read as a provider error and downgrade a
// real failure to a skip (see CLAUDE.md).
async function checkAll(
  html: string,
  expected: ReadonlyMap<string, string>,
  what: string,
): Promise<void> {
  const wrong: string[] = [];
  for (const [name, convert] of converters) {
    if ((await convert(html)) !== expected.get(name)) {
      wrong.push(name);
    }
  }
  assert(wrong.length === 0, `${what} changed on: ${wrong.join(", ")}`);
}

await runSuite(async () => {
  try {
    await test("a tag assembled by removing a script pair stays text, never a script element", async () => {
      // Removing the two <script></script> pairs used to join the halves into
      // <script>BODY</script>, which was then treated as a real element.
      await checkAll(
        "a <scr<script></script>ipt>BODY</scr<script></script>ipt> z",
        expectations(
          "a ipt>BODYipt> z",
          "a ipt>BODYipt> z",
          "a ipt>BODY ipt> z",
        ),
        "text around a script pair removed from inside a tag",
      );
    });

    await test("a tag assembled by removing a comment stays text, never a script element", async () => {
      await checkAll(
        "a <scr<!---->ipt>BODY</script> z",
        expectations("a ipt>BODY z", "a ipt>BODY z", "a ipt>BODY z"),
        "text around a comment removed from inside a script tag",
      );
      await checkAll(
        "a <sty<!---->le>BODY</style> z",
        expectations("a le>BODY z", "a le>BODY z", "a le>BODY z"),
        "text around a comment removed from inside a style tag",
      );
    });

    await test("script and style end tags may carry whitespace or attributes", async () => {
      await checkAll(
        'A <script>alert(1)</script >B <SCRIPT>alert(2)</SCRIPT\t>C <style>p{}</style x="y">D',
        expectations("A B C D", "A B C D", "A B C D"),
        "elements closed by a spaced or attributed end tag",
      );
    });

    await test("an element with no end tag loses only its start tag, later elements still close", async () => {
      await checkAll(
        "A <script>x B <style>p{}</style >C",
        expectations("A x B C", "A x B C", "A x B C"),
        "an unclosed script start tag before a closed style element",
      );
    });

    await test("a tag whose name only begins with script or style is an ordinary tag", async () => {
      await checkAll(
        "A <scripty>x</script>B <styled>y</style>C",
        expectations("A xB yC", "A xB yC", "A x B y C"),
        "text inside a tag named like script",
      );
    });

    await test("a comment that contains > is removed as a whole", async () => {
      await checkAll(
        "A <!-- a > b --> B",
        expectations("A B", "A B", "A B"),
        "a comment holding a > character",
      );
    });

    await test("ordinary page text keeps its shape", async () => {
      // One script is closed by a spaced end tag; everything else is plain
      // markup whose text has to come through exactly as it always did.
      const page =
        "<h1>Title</h1>Intro <b>bold</b> text<br>line two<br/>line three<hr>" +
        'rule <!-- hidden --><script>var x = "<b>";</script >' +
        '<style>p { color: red; }</style><a href="/x">link</a> end. ' +
        "3 > 2 stays";
      await checkAll(
        page,
        expectations(
          "Title\nIntro bold text\nline two\nline three\nrule link end. 3 > 2 stays",
          "Title Intro bold textline twoline threerule link end. 3 > 2 stays",
          "Title Intro bold text line two line three rule link end. 3 > 2 stays",
        ),
        "text of an ordinary page",
      );
    });

    // Worst-case documents: each is made of one unclosed construct repeated
    // tens of thousands of times. The regular expressions this replaced
    // rescanned the whole rest of the document from every repetition.
    const repeats = 25_000;
    const hostile: ReadonlyArray<
      readonly [family: string, html: string, converted: string]
    > = [
      [
        "unclosed script, style and comment openers",
        "<script".repeat(repeats) +
          "<style".repeat(repeats) +
          "<!--".repeat(repeats),
        "<script".repeat(repeats) +
          "<style".repeat(repeats) +
          "<!--".repeat(repeats),
      ],
      [
        "script start tags that are never closed",
        "<script>".repeat(repeats * 2),
        "",
      ],
      [
        "unclosed openers followed by one closing bracket",
        "<script".repeat(repeats) +
          "<style".repeat(repeats) +
          "<!--".repeat(repeats) +
          ">",
        "",
      ],
    ];
    const budgetMs = scaleTimeoutMs(2_000);

    for (const [family, html, converted] of hostile) {
      await test(`hostile document stays linear: ${family}`, async () => {
        const tooSlow: string[] = [];
        const wrong: string[] = [];
        for (const [name, convert] of converters) {
          const started = performance.now();
          const text = await convert(html);
          if (performance.now() - started >= budgetMs) {
            tooSlow.push(name);
          }
          if (text !== converted) {
            wrong.push(name);
          }
        }
        assert(
          tooSlow.length === 0,
          `${family} exceeded the ${budgetMs} ms linear-time budget on: ${tooSlow.join(", ")}`,
        );
        assert(
          wrong.length === 0,
          `${family} converted to different text on: ${wrong.join(", ")}`,
        );
      });
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
