#!/usr/bin/env tsx
/**
 * One Office-format bomb, in its own process, reporting peak memory.
 *
 * A child per scenario because `maxRSS` is a monotonic high-water mark: run
 * in-process across several tests, every measurement after the first reads
 * zero growth regardless of what it allocated, which is an assertion that can
 * only pass.
 *
 * `maxRSS` rather than a sampled `memoryUsage()` because the inflate is
 * synchronous — it holds the event loop for the whole allocation, so a
 * timer-based sampler never fires while the memory is live and reports a
 * reassuring zero.
 *
 * Usage: tsx test/helpers/officeProbeChild.ts <scenario> <fixturePath>
 * Prints one JSON line: { rssGrowthMb, outcome, detail }
 */
import * as fs from "node:fs";

const scenario = process.argv[2];
const fixture = process.argv[3];

function peakMb(): number {
  return process.resourceUsage().maxRSS / 1024;
}

type Verdict = {
  success?: boolean;
  error?: { code?: string; message?: string };
};

function describe(result: Verdict): string {
  return `success=${result.success} code=${result.error?.code ?? "-"}`;
}

async function run(buffer: Buffer): Promise<string> {
  switch (scenario) {
    case "word": {
      const { WordProcessor } =
        await import("../../src/lib/processors/document/WordProcessor.js");
      return describe(
        (await new WordProcessor().processFile({
          id: "w",
          name: "bomb.docx",
          mimetype:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: buffer.length,
          buffer,
        } as never)) as Verdict,
      );
    }
    case "excel": {
      const { ExcelProcessor } =
        await import("../../src/lib/processors/document/ExcelProcessor.js");
      return describe(
        (await new ExcelProcessor().processFile({
          id: "x",
          name: "bomb.xlsx",
          mimetype:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: buffer.length,
          buffer,
        } as never)) as Verdict,
      );
    }
    case "pptx": {
      const { PptxProcessor } =
        await import("../../src/lib/processors/document/PptxProcessor.js");
      const text = await PptxProcessor.extractText(buffer);
      return `extracted=${(text ?? "").length}`;
    }
    case "odt": {
      const { OpenDocumentProcessor } =
        await import("../../src/lib/processors/document/OpenDocumentProcessor.js");
      return describe(
        (await new OpenDocumentProcessor().processFile({
          id: "o",
          name: "bomb.odt",
          mimetype: "application/vnd.oasis.opendocument.text",
          size: buffer.length,
          buffer,
        } as never)) as Verdict,
      );
    }
    default:
      return `unknown scenario ${scenario}`;
  }
}

async function main(): Promise<void> {
  // Read before the baseline: the fixture's own bytes are not what is under
  // test, and charging them to the processor is how a bounded run reports a
  // number that looks unbounded.
  const buffer = fs.readFileSync(fixture);

  const baseline = peakMb();
  let outcome = "completed";
  let detail = "";
  try {
    detail = await run(buffer);
  } catch (error) {
    outcome = `threw: ${error instanceof Error ? error.message.slice(0, 140) : String(error)}`;
  }

  // Exit from the write callback: stdout is a pipe because the parent captures
  // it, pipe writes are asynchronous, and process.exit would not drain them.
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
