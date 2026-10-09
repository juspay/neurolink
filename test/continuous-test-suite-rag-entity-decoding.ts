#!/usr/bin/env tsx
/**
 * RAG text-reference contracts through actual public SDK exports.
 *
 * WebLoader reads an owned ordinary HTTP document; legacy HTMLChunker and
 * the public factory each process real HTML input. No internal decoder or
 * source module is imported. This verifies text fidelity, not HTML output
 * sanitization, adversarial rendering, or worst-case regular-expression cost.
 */
import "./helpers/credentialFreeEnv.js";
import { createServer } from "node:http";
import { HTMLChunker, WebLoader, createChunker } from "../dist/index.js";
import { assertEqual, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
const { test, runSuite } = defineSuite("RAG one-pass text references", {
  offline: true,
});
const pages = new Map<string, string>();
const requests: string[] = [];
const server = createServer((req, res) => {
  const route = req.url ?? "";
  requests.push(route);
  const page = pages.get(route);
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

async function legacyText(content: string): Promise<string> {
  const chunks = await legacy.chunk(`<p>${content}</p>`, {
    extractTextOnly: true,
    maxSize: 4096,
  });
  return chunks.map((chunk) => chunk.text).join(" ");
}

async function webText(route: string, content: string) {
  pages.set(route, `<html><body><p>${content}</p></body></html>`);
  const before = requests.length;
  const document = await loader.load(`${origin}${route}`, { timeout: 2000 });
  assertEqual(
    requests.length,
    before + 1,
    "WebLoader did not reach its owned HTTP document exactly once",
  );
  assertEqual(requests.at(-1), route, "WebLoader requested another document");
  assertEqual(
    document.getMetadata().source,
    `${origin}${route}`,
    "Document source metadata changed",
  );
  assertEqual(
    document.getType(),
    "html",
    "Existing document type contract changed",
  );
  return document.getContent();
}

await runSuite(async () => {
  try {
    await test("legacy nested named references decode exactly once", async () => {
      assertEqual(
        await legacyText("A &amp;lt;B&amp;gt; &amp;amp; C"),
        "A &lt;B&gt; &amp; C",
        "Legacy extraction decoded its own replacement output",
      );
    });
    await test("legacy nested numeric-looking reference stays literal", async () => {
      assertEqual(
        await legacyText("A &amp;#039; B"),
        "A &#039; B",
        "Legacy extraction reinterpreted a decoded ampersand",
      );
    });
    await test("legacy existing named set and apostrophe reference remain supported", async () => {
      assertEqual(
        await legacyText("A&nbsp;B &AMP; &lt;C&gt; &quot;D&quot; &#039;"),
        'A B & <C> "D" \u0027',
        "Legacy supported text changed",
      );
    });
    await test("legacy unsupported named and general numeric references remain literal", async () => {
      assertEqual(
        await legacyText("&apos; &#39; &#128512; &#x1F600; &ordinary;"),
        "&apos; &#39; &#128512; &#x1F600; &ordinary;",
        "Legacy extraction gained an undeclared decoding feature",
      );
    });
    await test("legacy ordinary whitespace is unchanged", async () => {
      assertEqual(
        await legacyText("  One\n\t two&nbsp; three  "),
        "One two three",
        "Legacy whitespace normalization changed",
      );
    });
    await test("web nested named references decode exactly once", async () => {
      assertEqual(
        await webText("/nested", "A &amp;lt;B&amp;gt; &amp;amp; C"),
        "A &lt;B&gt; &amp; C",
        "Web text decoded its own replacement output",
      );
    });
    await test("web nested numeric reference stays literal after the first decode", async () => {
      assertEqual(
        await webText("/nested-numeric", "A &amp;#128512; B"),
        "A &#128512; B",
        "Web text decoded a second layer",
      );
    });
    await test("web valid supplementary Unicode scalar is preserved", async () => {
      assertEqual(
        await webText("/supplementary", "Symbol &#128512; and BMP &#169;."),
        "Symbol 😀 and BMP ©.",
        "Numeric reference was truncated to a UTF-16 code unit",
      );
    });
    await test("web valid decimal upper scalar is preserved", async () => {
      assertEqual(
        await webText("/upper-scalar", "Symbol &#1114111;."),
        `Symbol ${String.fromCodePoint(0x10ffff)}.`,
        "Valid scalar boundary changed",
      );
    });
    await test("web invalid numeric references preserve their original literals", async () => {
      const content = "&#0; &#55296; &#57343; &#1114112; &#-1;";
      assertEqual(
        await webText("/invalid-numeric", content),
        content,
        "Invalid scalar reference wrapped or emitted an invalid character",
      );
    });
    await test("web unknown names and unsupported hexadecimal syntax remain literal", async () => {
      assertEqual(
        await webText("/unknown", "&ordinary; &#x1F600;"),
        "&ordinary; &#x1F600;",
        "Web text silently expanded its supported entity set",
      );
    });
    await test("web existing named set, apostrophes and whitespace remain supported", async () => {
      assertEqual(
        await webText(
          "/existing",
          "  A&nbsp;B &AMP; &lt;C&gt; &quot;D&quot; &apos; &#039; &#39;  ",
        ),
        'A B & <C> "D" \u0027 \u0027 \u0027',
        "Existing WebLoader text semantics changed",
      );
    });
    await test("factory V2 html retains its existing literal-reference behavior", async () => {
      const factory = await createChunker("html", { maxSize: 4096 });
      const chunks = await factory.chunk("<p>A &amp;amp; &#128512; B</p>");
      assertEqual(
        chunks.map((chunk) => chunk.text).join(" "),
        "A &amp;amp; &#128512; B",
        "Factory path gained entity decoding that was outside this change",
      );
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
