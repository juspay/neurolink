#!/usr/bin/env tsx
/**
 * One decompression scenario, in its own process, reporting peak memory.
 *
 * A child per scenario because `maxRSS` is a monotonic high-water mark. Run
 * in-process alongside other tests, the second measurement onwards reads zero
 * growth no matter what it allocated — a memory assertion that always passes,
 * which is worse than no assertion at all.
 *
 * `maxRSS` rather than a sampled `memoryUsage()`: `inflateRawSync` holds the
 * event loop for the whole allocation, so a timer-based sampler never runs
 * while the memory is live and reports a reassuring zero.
 *
 * Usage: tsx test/helpers/boundedProbeChild.ts <scenario> <fixturePath>
 * Prints one JSON line: { rssGrowthMb, outcome, detail }
 */
import * as http from "node:http";
import { BOMB_MB, buildGzBomb } from "./archiveBombFixtures.js";
import { FileReferenceRegistry } from "../../src/lib/files/fileReferenceRegistry.js";
import { createFileTools } from "../../src/lib/files/fileTools.js";
import { ArchiveProcessor } from "../../src/lib/processors/archive/ArchiveProcessor.js";

const scenario = process.argv[2];
const fixture = process.argv[3];

function peakMb(): number {
  return process.resourceUsage().maxRSS / 1024;
}

/** The tool the model calls: extract_file_content against an archive entry. */
async function viaExtractTool(): Promise<string> {
  const registry = new FileReferenceRegistry();
  const tools = createFileTools(registry) as unknown as Record<
    string,
    { execute: (args: unknown) => Promise<unknown> }
  >;
  await registry.registerFromPath(fixture);
  const listed = registry.list() as unknown as Array<{ id?: string }>;
  const fileId = listed[0]?.id ?? fixture;
  const out = (await tools.extract_file_content.execute({
    file_id: fileId,
    entry_path: "payload.txt",
  })) as { text?: string };
  return String(out?.text ?? "");
}

/**
 * A remote file whose HTTP response is gzip-encoded and expands hugely.
 *
 * Split into setup and run because building the payload allocates the very
 * 400MB the measurement is about. Measured together, the fixture's own cost is
 * attributed to the code under test and a perfectly bounded run reports ~650MB.
 */
async function prepareDownload(): Promise<{
  run: () => Promise<string>;
  cleanup: () => void;
}> {
  const payload = await buildGzBomb(BOMB_MB);
  const server = http.createServer((_req, res) => {
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "gzip",
    });
    res.end(payload);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.address() as { port: number }).port;
  return {
    run: async () => {
      const result = (await new ArchiveProcessor().processFile({
        id: "remote",
        name: "payload.gz",
        mimetype: "application/gzip",
        size: payload.length,
        url: `http://127.0.0.1:${port}/payload.gz`,
      } as never)) as { success?: boolean; error?: { code?: string } };
      return `success=${result.success} code=${result.error?.code ?? "-"}`;
    },
    cleanup: () => server.close(),
  };
}

/** A local archive handed straight to the processor. */
async function viaProcessFile(): Promise<string> {
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(fixture);
  const result = (await new ArchiveProcessor().processFile({
    id: "local",
    name: fixture.endsWith(".zip") ? "bomb.zip" : "bomb.gz",
    mimetype: fixture.endsWith(".zip") ? "application/zip" : "application/gzip",
    size: buffer.length,
    buffer,
  } as never)) as { success?: boolean; error?: { code?: string } };
  return `success=${result.success} code=${result.error?.code ?? "-"}`;
}

async function main(): Promise<void> {
  // Fixtures are built before the baseline is taken, so their own allocation
  // is not charged to the code under test.
  const download =
    scenario === "download" ? await prepareDownload() : undefined;

  const baseline = peakMb();
  let outcome = "completed";
  let detail = "";
  try {
    if (scenario === "extract-tool") {
      detail = await viaExtractTool();
    } else if (download) {
      detail = await download.run();
    } else {
      detail = await viaProcessFile();
    }
  } catch (error) {
    outcome = `threw: ${error instanceof Error ? error.message.slice(0, 120) : String(error)}`;
  } finally {
    download?.cleanup();
  }
  // Exit from the write callback. stdout is a pipe here because the parent
  // captures it, pipe writes are asynchronous, and `process.exit` does not
  // drain them — a truncated line would fail the parent's JSON.parse for a
  // reason that has nothing to do with the bound under test.
  process.stdout.write(
    `${JSON.stringify({
      rssGrowthMb: Math.round(peakMb() - baseline),
      outcome,
      detail: detail.replace(/\s+/g, " ").slice(0, 160),
    })}\n`,
    () => process.exit(0),
  );
}

void main();
