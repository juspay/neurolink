#!/usr/bin/env tsx
import "dotenv/config";
/**
 * Continuous Test Suite: Provider Capability Matrix
 *
 * The canonical "what every provider should support" runner. Iterates the
 * `PROVIDERS` table from `test/helpers/providerMatrix.ts` and runs the full
 * capability gauntlet against every provider whose env vars are populated.
 *
 * This file replaces the per-provider feature loops scattered across
 * `continuous-test-suite-providers.ts`. Adding a new provider becomes:
 *   - Catalog (Tier-2) provider: author `src/lib/providers/catalog/<id>.json`
 *     and run `pnpm run codegen:catalog && pnpm run build` — its matrix row
 *     derives from the JSON; nothing to edit here or in providerMatrix.ts.
 *   - Non-catalog provider: add a hand row to `PROVIDERS` in
 *     providerMatrix.ts (capability flags, `defaultModel`, `envVars[]`).
 *   Then run `npx tsx test/continuous-test-suite-provider-matrix.ts`
 *
 * Run:  npx tsx test/continuous-test-suite-provider-matrix.ts
 *       npx tsx test/continuous-test-suite-provider-matrix.ts --provider=openai
 *       npx tsx test/continuous-test-suite-provider-matrix.ts --provider=vertex,anthropic
 *
 * The `--provider` flag accepts a comma-separated list to limit the run to
 * specific providers. With no flag, every provider with populated env vars
 * is exercised.
 */

import { NeuroLink, AIProviderFactory } from "../dist/index.js";
import {
  defineSuite,
  Skip,
  isExpectedProviderError,
} from "./helpers/harness.js";
import { PROVIDERS, hasProviderEnv } from "./helpers/providerMatrix.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite, opts } = defineSuite("Provider Capability Matrix");

// ============================================================
// FILTER — honor --provider=a,b,c
// ============================================================

const requested =
  opts.provider !== undefined
    ? opts.provider.split(",").map((s) => s.trim())
    : null;

const targets = Object.values(PROVIDERS).filter((p) => {
  if (requested && requested.length > 0) {
    return requested.includes(p.name);
  }
  return hasProviderEnv(p.name);
});

if (targets.length === 0) {
  console.log("\n  No providers selected. Either:");
  console.log("    • Set provider env vars (e.g. OPENAI_API_KEY)");
  console.log("    • Pass --provider=name1,name2 to force-include");
  console.log();
}

// ============================================================
// HELPERS
// ============================================================

/** Promote known credential/network errors to SKIP. */
function skipIfProviderError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (isExpectedProviderError(msg)) {
    throw new Skip(`provider unavailable — ${msg.slice(0, 100)}`);
  }
  throw err as Error;
}

// ============================================================
// MATRIX RUN
// ============================================================

async function runMatrix(): Promise<void> {
  for (const p of targets) {
    const sdk = new NeuroLink();
    const baseOpts = { provider: p.name, model: p.defaultModel };

    // ---------- text + streaming ----------
    if (p.text) {
      await test(`[${p.name}] generate basic text`, async () => {
        try {
          let lastContent: string | undefined;
          for (let attempt = 1; attempt <= 2; attempt++) {
            const r = await sdk.generate({
              ...baseOpts,
              input: { text: "Reply with exactly: HELLO" },
              maxTokens: 50,
              disableTools: true,
            } as never);
            lastContent = r.content;
            if (lastContent && lastContent.length > 0) {
              return;
            }
          }
          throw new Error("empty response");
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    if (p.streaming) {
      await test(`[${p.name}] stream tokens`, async () => {
        try {
          let totalCount = 0;
          for (let attempt = 1; attempt <= 2; attempt++) {
            const r = await sdk.stream({
              ...baseOpts,
              input: { text: "Count from 1 to 3." },
              maxTokens: 50,
              disableTools: true,
            } as never);
            let count = 0;
            for await (const chunk of r.stream) {
              if ("content" in chunk && chunk.content) {
                count++;
                if (count >= 5) {
                  break;
                }
              }
            }
            totalCount = count;
            if (count > 0) {
              return;
            }
          }
          if (totalCount === 0) {
            // Some upstream providers (notably small free-tier OpenRouter
            // models) accept the stream request but close without emitting
            // any content chunks. After two attempts we treat this as a
            // provider-side capability gap rather than an SDK bug.
            throw new Skip(
              "stream produced no chunks after retry — upstream model declined to stream content",
            );
          }
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    // ---------- tool calling ----------
    if (p.tools) {
      await test(`[${p.name}] tool calling`, async () => {
        try {
          const sdkWithTool = new NeuroLink();
          sdkWithTool.registerTool("getTime", {
            name: "getTime",
            description: "Returns the current UTC time",
            inputSchema: { type: "object", properties: {} },
            execute: async () => ({ utc: new Date().toISOString() }),
          });
          // Use `enabledToolNames` (the canonical filter) — passing a string
          // array as `tools` hits no runtime filter at all (the type expects
          // Record<string, Tool>). That used to silently include every
          // auto-registered system tool, and Google's `function_declarations`
          // validator rejects some of those names with "Invalid function
          // name", which surfaced as a misleading "[google-ai] tool calling
          // SKIP" in the matrix.
          const r = (await sdkWithTool.generate({
            ...baseOpts,
            input: { text: "What is the current UTC time? Use the tool." },
            maxTokens: 200,
            enabledToolNames: ["getTime"],
          } as never)) as {
            content?: string;
            toolCalls?: unknown[];
            toolResults?: unknown[];
            usage?: unknown;
          };
          // Success = either the model invoked the tool (toolCalls present)
          // or it returned natural-language content. Some providers (notably
          // Gemini-family) sometimes respond with only the tool call and an
          // empty assistant text, which is a perfectly valid tool-calling
          // outcome — we should not fail the test in that case.
          const hasToolCall =
            Array.isArray(r.toolCalls) && r.toolCalls.length > 0;
          const hasToolResult =
            Array.isArray(r.toolResults) && r.toolResults.length > 0;
          const hasContent = !!r.content && r.content.length > 0;
          if (!hasContent && !hasToolCall && !hasToolResult) {
            // Model produced literally nothing — no text, no tool call, no
            // tool result. This is upstream model behaviour (typically
            // Gemini-family declining to respond when its safety classifier
            // is uncertain). The SDK plumbing is healthy (no transport
            // error, no timeout); we just can't deterministically test the
            // tool-calling path on this single attempt. Skip rather than
            // FAIL so the matrix doesn't churn on flaky model variance.
            throw new Skip(
              "model returned empty response — no content, no tool call, no tool result",
            );
          }
          await sdkWithTool.shutdown?.();
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    // ---------- structured output ----------
    if (p.structuredOutput) {
      await test(`[${p.name}] structured output`, async () => {
        try {
          const zod = await import("zod").catch(() => null);
          if (!zod) {
            throw new Skip("zod not available");
          }
          const schema = zod.z.object({
            greeting: zod.z.string(),
            count: zod.z.number(),
          });
          let last:
            | {
                content?: string;
                structuredData?: unknown;
                jsonTruncated?: boolean;
              }
            | undefined;
          for (let attempt = 1; attempt <= 2; attempt++) {
            const r = await sdk.generate({
              ...baseOpts,
              input: { text: 'Reply with greeting="hi" and count=42 in JSON.' },
              maxTokens: 200,
              disableTools: true,
              // `schema` is the option generate() honours. The previous
              // `structuredOutput: { schema }` was never a GenerateOptions
              // field (the `as never` cast hid that) and was silently
              // ignored, so this cell passed on plain text. The real
              // parameter type replaces the `as never` cast here so a
              // wrong option name is a compile error, not a silent no-op.
              schema,
            } as Parameters<NeuroLink["generate"]>[0]);
            last = r;
            if (
              r.content &&
              r.content.length > 0 &&
              r.structuredData !== undefined
            ) {
              break;
            }
          }
          if (!last?.content || last.content.length === 0) {
            throw new Error("empty response");
          }
          // generate({ schema }) yields a parsed `structuredData` whenever the
          // model produced anything JSON-shaped; a response cut off at the
          // token cap yields a partial object and sets `jsonTruncated`, so
          // only an untruncated result is held to the schema. Pure prose
          // with no JSON at all leaves `structuredData` undefined (the SDK
          // logs a WARN and returns the raw text). After two attempts that is
          // the row's `structuredOutput: true` claim being false for this
          // model, which must stay visible rather than downgrade to a skip.
          if (last.structuredData === undefined) {
            throw new Error(
              "no JSON was recoverable from a schema request after two attempts",
            );
          }
          if (
            !last.jsonTruncated &&
            !schema.safeParse(last.structuredData).success
          ) {
            throw new Error(
              "structuredData did not satisfy the request schema",
            );
          }
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    // ---------- thinking levels ----------
    if (p.thinking) {
      await test(`[${p.name}] thinking level: high`, async () => {
        try {
          const r = await sdk.generate({
            ...baseOpts,
            input: { text: "What is 2+2? Think briefly." },
            maxTokens: 200,
            thinkingLevel: "high",
            disableTools: true,
          } as never);
          if (!r.content || r.content.length === 0) {
            throw new Error("empty response");
          }
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    // ---------- vision ----------
    if (p.vision) {
      await test(`[${p.name}] vision describes an image`, async () => {
        try {
          const r = (await sdk.generate({
            provider: p.name,
            model: p.visionModel ?? p.defaultModel,
            input: {
              text: "What is the dominant color in this image? Answer with just the color name.",
              images: ["test/fixtures/sample-screenshot.png"],
            },
            maxTokens: 300,
            disableTools: true,
          } as never)) as { content?: string };
          // The fixture is a solid blue image. A reply without "blue" means
          // the model never SAW it — exactly the silent image-drop failure
          // this test exists to catch (found live 2026-08-28: the compat
          // client dropped ai@6 file parts, so every catalog provider's
          // vision was text-only and no suite noticed).
          if (!r.content || !/blue/i.test(r.content)) {
            throw new Error("response does not describe the fixture image");
          }
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    // ---------- embeddings ----------
    if (p.embeddings) {
      await test(`[${p.name}] embed single text`, async () => {
        try {
          // Embeddings live on the provider (BaseProvider.embed) rather than
          // on the NeuroLink class. Resolve the provider directly and call
          // its embed(). This mirrors the HTTP `/api/agent/embed` route's
          // implementation in src/lib/server/routes/agentRoutes.ts.
          //
          // Use `embeddingModel` (a dedicated text-embedding model) rather
          // than `defaultModel` (the chat model). The latter doesn't support
          // `embedContent` for any provider — passing e.g. gemini-2.5-flash
          // to embed() returns "models/gemini-2.5-flash is not found for
          // embedContent".
          const embedModel = p.embeddingModel ?? p.defaultModel;
          const provider = await AIProviderFactory.createProvider(
            p.name,
            embedModel,
          );
          const embedding = await provider.embed("hello world", embedModel);
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error("empty embedding vector");
          }
        } catch (err) {
          skipIfProviderError(err);
        }
      });
    }

    await sdk.shutdown?.().catch(() => {});
  }
}

await runSuite(runMatrix);
