#!/usr/bin/env tsx
/**
 * RAG input bounds, driven through the built package (`dist/index.js`).
 *
 * 1. `LaTeXChunker` finds the `\begin{document}` ... `\end{document}` body in
 *    linear time. The old pattern rescanned to the end of the text from every
 *    `\begin{document}`, so a document that opens the environment many times
 *    without closing it cost quadratic time. Ordinary documents must chunk
 *    exactly as they did before: `test/fixtures/rag/latex-document-boundaries.json`
 *    holds the chunks the previous build produced for each case.
 * 2. The built-in hash embedding behind `prepareRAGTool` / `generate({ rag })`
 *    refuses text over 1,048,576 characters with a named error, instead of
 *    iterating over a length the caller chose, and leaves everything at or
 *    below that length untouched.
 *
 * Everything runs offline against owned files and an owned local HTTP
 * endpoint. No timing assertion compares two builds: the adversarial inputs
 * take seconds on the quadratic pattern and milliseconds on the linear one,
 * and the budget below sits between the two with a wide margin on each side.
 */
import "./helpers/credentialFreeEnv.js";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LaTeXChunker, NeuroLink, prepareRAGTool } from "../dist/index.js";
import type { RAGPreparedTool } from "../src/lib/types/index.js";
import {
  assert,
  assertEqual,
  defineSuite,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  startLocalOpenAICompatible,
  toolNamesOnWire,
} from "./helpers/openaiCompatibleLocalEndpoint.js";

assertDistFresh({ entrypoints: ["dist/index.js"] });

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "rag",
);
const HASH_EMBEDDING_LIMIT = 1_048_576;
const OVER_LIMIT_MESSAGE = (length: number): string =>
  `Invalid parameters for tool 'rag.hashEmbedding': text is ${length} characters, over the ${HASH_EMBEDDING_LIMIT} character limit of the built-in hash embedding. Lower chunkSize, shorten the query, or configure an embeddingProvider.`;

type LatexCase = {
  name: string;
  text?: string;
  textFile?: string;
  config: Record<string, unknown>;
  expected: Array<{ text: string; metadata: Record<string, unknown> }>;
};

function loadLatexCases(): LatexCase[] {
  const parsed: unknown = JSON.parse(
    readFileSync(join(FIXTURES, "latex-document-boundaries.json"), "utf-8"),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("cases" in parsed) ||
    !Array.isArray(parsed.cases) ||
    parsed.cases.length === 0
  ) {
    throw new Error("latex-document-boundaries.json has no cases");
  }
  return parsed.cases as LatexCase[];
}

function normalise(
  chunks: Array<{ text: string; metadata: Record<string, unknown> }>,
) {
  return chunks.map((chunk) => {
    const { documentId: _documentId, ...metadata } = chunk.metadata;
    return JSON.parse(JSON.stringify({ text: chunk.text, metadata }));
  });
}

async function runSearch(
  prepared: RAGPreparedTool,
  query: string,
): Promise<{
  totalResults: number;
  sources: Array<{ id: string; score: number; source: string }>;
}> {
  const execute = prepared.tool.execute;
  if (typeof execute !== "function") {
    throw new Error("the prepared RAG tool has no execute()");
  }
  const result: unknown = await execute(
    { query },
    { toolCallId: "rag-bounds", messages: [] },
  );
  return result as {
    totalResults: number;
    sources: Array<{ id: string; score: number; source: string }>;
  };
}

async function rejection(work: Promise<unknown>): Promise<Error> {
  const outcome = await work.then(
    () => ({ rejected: false as const }),
    (error: unknown) => ({ rejected: true as const, error }),
  );
  if (!outcome.rejected) {
    throw new Error("the work resolved where a rejection was expected");
  }
  if (!(outcome.error instanceof Error)) {
    throw new Error("the work rejected with a value that is not an Error");
  }
  return outcome.error;
}

const { test, runSuite } = defineSuite("RAG input bounds", { offline: true });

await runSuite(async () => {
  const chunker = new LaTeXChunker();

  // On the pattern this replaced the cost grows with the square of the length:
  // the two inputs below (50,000 repetitions, 850,000 characters) took 14.3 s
  // and 17.0 s, and 30,000 repetitions took 6.8 s and 8.9 s. The linear version
  // needs under 10 ms for the 510,000-character form of the same input, so a
  // 1 s budget sits well clear of a slow runner on one side and of a
  // regression on the other.
  const LATEX_BUDGET_MS = 1000;
  const adversarial: Array<{ name: string; text: string }> = [
    {
      name: "many \\begin{document} and no \\end{document}",
      text: "\\begin{document}a".repeat(50_000),
    },
    {
      name: "a lone \\end{document} first, then many \\begin{document}",
      text: `\\end{document}${"\\begin{document}a".repeat(50_000)}`,
    },
  ];
  for (const { name, text } of adversarial) {
    await test(`latex: ${name} chunks within the time budget and loses no text`, async () => {
      const started = performance.now();
      const chunks = await chunker.chunk(text, { maxSize: 1000, overlap: 0 });
      const elapsedMs = performance.now() - started;
      assert(
        elapsedMs < LATEX_BUDGET_MS,
        `chunking took ${Math.round(elapsedMs)} ms, over the ${LATEX_BUDGET_MS} ms budget`,
      );
      assertEqual(
        chunks.map((chunk) => chunk.text).join(""),
        text,
        "the chunks do not reassemble the input",
      );
    });
  }

  for (const entry of loadLatexCases()) {
    await test(`latex: ${entry.name} chunks exactly as before`, async () => {
      const input =
        entry.textFile !== undefined
          ? readFileSync(join(FIXTURES, entry.textFile), "utf-8")
          : entry.text;
      if (typeof input !== "string") {
        throw new Error(`fixture case ${entry.name} has no text`);
      }
      const chunks = await chunker.chunk(input, entry.config);
      const actual = normalise(chunks);
      assertEqual(
        actual.length,
        entry.expected.length,
        `chunk count differs for ${entry.name}`,
      );
      for (let i = 0; i < actual.length; i++) {
        assert(
          JSON.stringify(actual[i]) === JSON.stringify(entry.expected[i]),
          `chunk ${i} differs for ${entry.name}`,
        );
      }
    });
  }

  const dir = tempDir("rag-bounds-");
  const owned = (name: string, text: string): string => {
    const path = join(dir, name);
    writeFileSync(path, text);
    return path;
  };

  await test("hash embedding: ordinary documents index and rank exactly as before", async () => {
    const files = [
      owned(
        "harbour.txt",
        "The harbour master logs every tide table entry. Cargo ships wait for the morning tide before entering the harbour. Pilots guide each vessel past the breakwater.",
      ),
      owned(
        "orchard.txt",
        "Apple growers prune the orchard in winter. Pollination depends on bees visiting the blossom. Cider presses run after the autumn harvest of apples.",
      ),
      owned(
        "ledger.md",
        "# Ledger\n\nQuarterly revenue grew while operating cost stayed flat.\n\n## Notes\n\nAudit adjustments were posted to the revenue ledger.",
      ),
    ];
    const prepared = await prepareRAGTool({
      files,
      chunkSize: 120,
      chunkOverlap: 20,
      topK: 3,
    });
    assertEqual(prepared.chunksIndexed, 6, "chunks indexed changed");
    assertEqual(prepared.filesLoaded, 3, "files loaded changed");

    // Captured from the build before the length limit existed. Scores are
    // exact: the embedding is deterministic and unchanged below the limit.
    const expected: Record<string, Array<[string, string, number]>> = {
      "when do cargo ships enter the harbour with the tide": [
        ["rag-chunk-0", "harbour.txt", 0.9222555519730065],
        ["rag-chunk-2", "orchard.txt", 0.8656239594827777],
        ["rag-chunk-4", "ledger.md", 0.8389267239158638],
        ["rag-chunk-1", "harbour.txt", 0.8763966636784574],
        ["rag-chunk-3", "orchard.txt", 0.8611897535499823],
        ["rag-chunk-5", "ledger.md", 0.8000980225389921],
      ],
      "apple orchard pruning and cider": [
        ["rag-chunk-2", "orchard.txt", 0.7383444466485193],
        ["rag-chunk-0", "harbour.txt", 0.7374580155435257],
        ["rag-chunk-4", "ledger.md", 0.712794893999787],
        ["rag-chunk-3", "orchard.txt", 0.6609533192292582],
        ["rag-chunk-1", "harbour.txt", 0.6621178687741877],
        ["rag-chunk-5", "ledger.md", 0.5906576257630919],
      ],
      "revenue ledger audit": [
        ["rag-chunk-4", "ledger.md", 0.8328373930317645],
        ["rag-chunk-1", "harbour.txt", 0.7532463985883383],
        ["rag-chunk-2", "orchard.txt", 0.665954059915722],
        ["rag-chunk-5", "ledger.md", 0.8285747513787828],
        ["rag-chunk-0", "harbour.txt", 0.7181733536269557],
        ["rag-chunk-3", "orchard.txt", 0.6576667733272069],
      ],
    };
    for (const [query, rows] of Object.entries(expected)) {
      const result = await runSearch(prepared, query);
      assertEqual(
        JSON.stringify(
          result.sources.map((s) => [
            s.id,
            s.source.slice(s.source.lastIndexOf("/") + 1),
            s.score,
          ]),
        ),
        JSON.stringify(rows),
        `ranking changed for query #${Object.keys(expected).indexOf(query)}`,
      );
    }
  });

  await test("hash embedding: a chunk exactly at the limit is indexed", async () => {
    const file = owned("at-limit.txt", "a".repeat(HASH_EMBEDDING_LIMIT));
    const prepared = await prepareRAGTool({
      files: [file],
      strategy: "character",
      chunkSize: 2_000_000,
    });
    assertEqual(
      prepared.chunksIndexed,
      1,
      "the at-limit chunk was not indexed",
    );
  });

  await test("hash embedding: a chunk one character over the limit is refused with the named error", async () => {
    const file = owned("over-limit.txt", "a".repeat(HASH_EMBEDDING_LIMIT + 1));
    const error = await rejection(
      prepareRAGTool({
        files: [file],
        strategy: "character",
        chunkSize: 2_000_000,
      }),
    );
    assertEqual(
      error.message,
      OVER_LIMIT_MESSAGE(HASH_EMBEDDING_LIMIT + 1),
      "the refusal message changed",
    );
    assertEqual(
      (error as Error & { code?: string }).code,
      "INVALID_PARAMETERS",
      "the refusal lost its error code",
    );
  });

  await test("hash embedding: the default chunk size keeps a large file indexable", async () => {
    const file = owned(
      "large-but-chunked.txt",
      "lorem ipsum dolor sit amet ".repeat(80_000),
    );
    const prepared = await prepareRAGTool({ files: [file], chunkSize: 1000 });
    assert(
      prepared.chunksIndexed > 1000,
      "a 2 M character file did not split into many default-size chunks",
    );
  });

  await test("hash embedding: a query at the limit searches and one over it is refused", async () => {
    const file = owned(
      "small.txt",
      "A short document about tides and harbours.",
    );
    const prepared = await prepareRAGTool({ files: [file] });
    const ok = await runSearch(prepared, "t".repeat(HASH_EMBEDDING_LIMIT));
    assertEqual(ok.totalResults, 1, "the at-limit query returned no result");
    const error = await rejection(
      runSearch(prepared, "t".repeat(HASH_EMBEDDING_LIMIT + 1)),
    );
    assertEqual(
      error.message,
      OVER_LIMIT_MESSAGE(HASH_EMBEDDING_LIMIT + 1),
      "the query refusal message changed",
    );
  });

  await test("hash embedding: a configured provider that fails falls back to the hash for an in-limit index and the refusal covers an over-limit one", async () => {
    // A stand-in that answers every route with 404, which the embedding client
    // does not retry, and counts the embedding calls so the test can prove the
    // provider was tried before the hash fallback took over.
    let embeddingCalls = 0;
    const server = createServer((req, res) => {
      if (req.method === "POST" && req.url?.endsWith("/embeddings")) {
        embeddingCalls += 1;
      }
      req.resume();
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const saved = {
      base: process.env.OPENAI_BASE_URL,
      key: process.env.OPENAI_API_KEY,
    };
    process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}`;
    process.env.OPENAI_API_KEY = "sk-local-endpoint-not-real";
    try {
      const configured = {
        embeddingProvider: "openai",
        embeddingModel: "text-embedding-3-small",
        strategy: "character" as const,
        chunkSize: 2_000_000,
      };
      const within = await prepareRAGTool({
        ...configured,
        files: [owned("fallback-within.txt", "tides ".repeat(1000))],
      });
      assertEqual(
        within.chunksIndexed,
        1,
        "an in-limit index did not survive the provider failure",
      );
      assert(
        embeddingCalls > 0,
        "the configured provider was never asked to embed, so the fallback did not run",
      );
      const callsBeforeOver = embeddingCalls;
      const error = await rejection(
        prepareRAGTool({
          ...configured,
          files: [
            owned("fallback-over.txt", "a".repeat(HASH_EMBEDDING_LIMIT + 1)),
          ],
        }),
      );
      assert(
        embeddingCalls > callsBeforeOver,
        "the configured provider was not asked to embed the over-limit chunk",
      );
      assertEqual(
        error.message,
        OVER_LIMIT_MESSAGE(HASH_EMBEDDING_LIMIT + 1),
        "the refusal after the provider fallback changed",
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      for (const [name, value] of [
        ["OPENAI_BASE_URL", saved.base],
        ["OPENAI_API_KEY", saved.key],
      ] as const) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });

  await test("generate({ rag }): an over-limit chunk leaves the search tool off the request, an in-limit one attaches it", async () => {
    const local = await startLocalOpenAICompatible();
    const saved = {
      base: process.env.GROQ_BASE_URL,
      key: process.env.GROQ_API_KEY,
    };
    process.env.GROQ_BASE_URL = local.baseURL;
    process.env.GROQ_API_KEY = "sk-local-endpoint-not-real";
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    try {
      const ask = async (path: string): Promise<string[]> => {
        const before = local.requests.length;
        await nl.generate({
          input: { text: "What do the documents say about tides?" },
          provider: "groq",
          maxTokens: 50,
          rag: { files: [path], strategy: "character", chunkSize: 2_000_000 },
        });
        assertEqual(
          local.requests.length,
          before + 1,
          "generate did not make exactly one request to the owned endpoint",
        );
        return toolNamesOnWire(local.requests[before]);
      };
      const within = await ask(owned("gen-within.txt", "tides ".repeat(1000)));
      assert(
        within.includes("search_knowledge_base"),
        "an in-limit document did not attach the search tool",
      );
      const over = await ask(
        owned("gen-over.txt", "a".repeat(HASH_EMBEDDING_LIMIT + 1)),
      );
      assert(
        !over.includes("search_knowledge_base"),
        "an over-limit document still attached the search tool",
      );
    } finally {
      await nl.shutdown();
      await local.close();
      for (const [name, value] of [
        ["GROQ_BASE_URL", saved.base],
        ["GROQ_API_KEY", saved.key],
      ] as const) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });
});
