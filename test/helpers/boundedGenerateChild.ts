#!/usr/bin/env tsx
/**
 * One bomb scenario, in its own process, reporting peak memory.
 *
 * This is the half of the bound probes that survives CLAUDE.md rule 15: it
 * imports nothing but the built package (`dist/`), so what it measures is what
 * a caller of `generate()` or the `./files` export would pay.
 *
 * ## Why a child per scenario
 *
 * `process.resourceUsage().maxRSS` is a monotonic high-water mark. Run in the
 * suite's own process, every measurement after the first large allocation reads
 * zero growth whatever it allocated, which is an assertion that can only pass.
 *
 * ## Why `maxRSS` rather than a sampled `memoryUsage()`
 *
 * A synchronous inflate holds the event loop for the whole allocation, so a
 * timer-based sampler never runs while the memory is live and reports a
 * reassuring zero. The high-water mark is recorded by the OS regardless.
 *
 * ## Why a warm-up
 *
 * The SDK loads processors, parsers and the provider client lazily. Without a
 * first, ordinary call those one-off module loads would be charged to the
 * bomb, and the baseline would depend on which module happened to load first.
 * The warm-up uses a file of the same shape as the bomb, so it loads the same
 * processor and, for a ZIP, takes the same decode path (DEFLATED, not stored);
 * the parent also reads that request off the mock server, which turns it into
 * the check that an ordinary file still gets through.
 *
 * Fixtures are built by the parent before this process starts, so their own
 * allocation is never charged to the code under test either.
 *
 * Usage:
 *   node --import tsx test/helpers/boundedGenerateChild.ts \
 *     generate <warmupFile> <bombFile> <mockBaseURL>
 *   node --import tsx test/helpers/boundedGenerateChild.ts \
 *     extract-entry <warmupFile> <bombFile> <mockBaseURL> <warmupEntry> <bombEntry>
 *
 * Prints one JSON line:
 * { baselineMb, peakMb, rssGrowthMb, warmup, warmupDetail, outcome, detail }
 */
import { NeuroLink } from "../../dist/index.js";
import {
  FileReferenceRegistry,
  createFileTools,
} from "../../dist/files/index.js";

const [scenario, warmupFile, bombInput, baseURL, warmupEntry, bombEntry] =
  process.argv.slice(2);

const PROMPT = "Summarize the attached file.";

if (
  (scenario !== "generate" && scenario !== "extract-entry") ||
  warmupFile === undefined ||
  bombInput === undefined ||
  baseURL === undefined ||
  (scenario === "extract-entry" &&
    (warmupEntry === undefined || bombEntry === undefined))
) {
  process.stderr.write(
    "usage: boundedGenerateChild.ts generate <warmupFile> <bombFile> <mockBaseURL>\n" +
      "       boundedGenerateChild.ts extract-entry <warmupFile> <bombFile> <mockBaseURL> <warmupEntry> <bombEntry>\n",
  );
  process.exit(2);
}

function peakMb(): number {
  return process.resourceUsage().maxRSS / 1024;
}

function briefly(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 160) : String(error);
}

/** The ordinary public call: attach a file to `generate()`. */
async function viaGenerate(file: string): Promise<string> {
  const result = await new NeuroLink().generate({
    input: { text: PROMPT, files: [file] },
    provider: "openai",
    credentials: { openai: { apiKey: "sk-mock-local-server", baseURL } },
    maxTokens: 64,
    timeout: 60_000,
    // Default tool discovery starts MCP server processes: seconds per call, and
    // children that keep this process alive. File processing runs before the
    // tools are consulted, so none of it is skipped.
    disableTools: true,
  });
  return String(result.content ?? "");
}

/**
 * The tool a model calls to read one entry of an attached archive.
 *
 * Not reachable from `generate()`: `ArchiveProcessor` drops entries that
 * declare size 0 when it reads them eagerly, so an entry that lies about its
 * size is only ever opened on demand, through the registry behind the package's
 * `./files` export.
 */
async function viaExtractTool(file: string, entry: string): Promise<string> {
  const registry = new FileReferenceRegistry();
  try {
    const tools = createFileTools(registry);
    const ref = await registry.registerFromPath(file);
    const out: unknown = await tools.extract_file_content.execute?.(
      { file_id: ref.id, entry_path: entry },
      { toolCallId: "bounded-probe", messages: [] },
    );
    return JSON.stringify(out ?? "");
  } finally {
    await registry.clear();
  }
}

async function run(file: string, entry: string | undefined): Promise<string> {
  return scenario === "extract-entry" && entry !== undefined
    ? viaExtractTool(file, entry)
    : viaGenerate(file);
}

async function main(): Promise<void> {
  let warmup = "completed";
  let warmupDetail = "";
  try {
    warmupDetail = await run(warmupFile, warmupEntry);
  } catch (error) {
    warmup = `threw: ${briefly(error)}`;
  }

  const baseline = peakMb();
  let outcome = "completed";
  let detail = "";
  try {
    detail = await run(bombInput, bombEntry);
  } catch (error) {
    outcome = `threw: ${briefly(error)}`;
  }
  const peak = peakMb();

  // Exit from the write callback. stdout is a pipe because the parent captures
  // it, pipe writes are asynchronous, and `process.exit` does not drain them: a
  // truncated line would fail the parent's JSON.parse for a reason that has
  // nothing to do with the bound under test.
  process.stdout.write(
    `${JSON.stringify({
      baselineMb: Math.round(baseline),
      peakMb: Math.round(peak),
      rssGrowthMb: Math.max(0, Math.round(peak - baseline)),
      warmup,
      warmupDetail: warmupDetail.replace(/\s+/g, " ").slice(0, 200),
      outcome,
      detail: detail.replace(/\s+/g, " ").slice(0, 200),
    })}\n`,
    () => process.exit(0),
  );
}

void main();
