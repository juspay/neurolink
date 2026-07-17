import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { NeuroLink } from "@juspay/neurolink";

// Auto-selects the first provider with a matching API key in the
// environment (see .env.example) — no provider name required here.
const neurolink = new NeuroLink();

// To pin a specific provider/model instead of auto-selection, pass it on
// each stream() call below, e.g.:
// const result = await neurolink.stream({ input: { text }, provider: "anthropic", model: "claude-sonnet-4-5" });

const rl = createInterface({ input: stdin, output: stdout });

const printWelcome = (): void => {
  console.log("NeuroLink terminal chat. Type a message and press Enter.");
  console.log("Type /exit or press Ctrl+C to quit.\n");
};

const isTextChunk = (chunk: unknown): chunk is { content: string } =>
  typeof chunk === "object" &&
  chunk !== null &&
  "content" in chunk &&
  typeof (chunk as { content: unknown }).content === "string";

const streamReply = async (text: string): Promise<void> => {
  // stream() returns a StreamResult whose `.stream` is an AsyncIterable of
  // text/reasoning/audio/image chunk events — plain-text chunks carry a
  // `content` string field (src/lib/types/stream.ts:664-672).
  const result = await neurolink.stream({ input: { text } });

  for await (const chunk of result.stream) {
    if (isTextChunk(chunk) && chunk.content.length > 0) {
      stdout.write(chunk.content);
    }
  }
  stdout.write("\n\n");
};

const main = async (): Promise<void> => {
  printWelcome();

  for (;;) {
    const line = await rl.question("you> ");
    const text = line.trim();

    if (text.length === 0) {
      continue;
    }
    if (text === "/exit") {
      break;
    }

    stdout.write("ai>  ");
    try {
      await streamReply(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n[error] ${message}\n`);
    }
  }

  rl.close();
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
