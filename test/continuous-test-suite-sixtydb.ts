#!/usr/bin/env tsx
/** Exercise the built public SDK and a real local HTTP transport, without vendor credentials. */
import { createServer } from "node:http";
import { once } from "node:events";
import { strict as assert } from "node:assert";
import {
  NeuroLink,
  SixtyDBTTS,
  TTSProcessor,
  TTSError,
  registerDefaultTTSHandlers,
} from "../dist/index.js";
import type { TTSOptions } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("60db TTS", { offline: true });
const voice = "038cf0d1-eef8-45a6-81b0-99c5e57a33d2";
const fastVoice = "fbb75ed2-975a-40c7-9e06-38e30524a9a1";
const pcm = Buffer.from([255, 255, 0, 0, 1, 0, 0, 128]);
let responseBody = JSON.stringify({
  success: true,
  audio_base64: pcm.toString("base64"),
  sample_rate: 24000,
});
let status = 200;
let hangBody = false;
let hangingBodyClosed = false;
let wav: Buffer | undefined;
const requests: Array<{
  path: string;
  authorization?: string;
  body: Record<string, unknown>;
}> = [];
const server = createServer(async (request, response) => {
  let data = "";
  for await (const chunk of request) {
    data += chunk;
  }
  requests.push({
    path: request.url ?? "",
    authorization: request.headers.authorization,
    body: data ? JSON.parse(data) : {},
  });
  response.writeHead(status, { "Content-Type": "application/json" });
  if (hangBody) {
    response.on("close", () => {
      hangingBodyClosed = true;
    });
    response.write('{"audio_base64":"');
    return;
  }
  if (request.url?.startsWith("/voices")) {
    const fast = request.url.includes("fast");
    response.end(
      JSON.stringify({
        success: true,
        data: [
          {
            voice_id: fast ? fastVoice : voice,
            name: fast ? "Fast fixture" : "Quality fixture",
            labels: { language: fast ? "hi" : "en", gender: "female" },
          },
        ],
      }),
    );
  } else {
    response.end(responseBody);
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert(address && typeof address === "object");
const endpoint = `http://127.0.0.1:${address.port}`;
const priorKey = process.env.SIXTYDB_API_KEY;
const priorVoice = process.env.SIXTYDB_DEFAULT_VOICE;
const priorHandlers = TTSProcessor.listProviders().map(
  (name) => [name, TTSProcessor.getHandler(name)] as const,
);
const sdk = new NeuroLink({ conversationMemory: { enabled: false } });

async function generate(options: TTSOptions = {}) {
  return sdk.generate({
    provider: "openai",
    model: "gpt-4o-mini",
    disableTools: true,
    credentials: { openai: { apiKey: "offline-test-key" } },
    input: { text: "HTTP speech transport check." },
    tts: { enabled: true, provider: "sixtydb", voice, ...options },
  });
}

await runSuite(async () => {
  try {
    await test("Default registration exposes the exported provider", async () => {
      process.env.SIXTYDB_API_KEY = "offline-test-key";
      registerDefaultTTSHandlers();
      assert(TTSProcessor.getHandler("sixtydb") instanceof SixtyDBTTS);
      TTSProcessor.registerHandler(
        "sixtydb",
        new SixtyDBTTS("offline-test-key", endpoint),
      );
    });
    await test("generate returns WAV and serializes the nested audio configuration", async () => {
      const result = await generate();
      assert.equal(result.ttsMetadata?.success, true);
      assert.equal(result.audio?.format, "wav");
      assert.equal(result.audio?.sampleRate, 24000);
      assert.deepEqual(result.audio?.buffer.subarray(44), pcm);
      assert.equal(result.audio?.buffer.readUInt32LE(24), 24000);
      wav = result.audio?.buffer;
      const sent = requests.at(-1);
      assert.equal(sent?.path, "/tts-synthesize");
      assert.equal(sent?.authorization, "Bearer offline-test-key");
      assert.deepEqual(sent?.body.audio_config, {
        audio_encoding: "LINEAR16",
        sample_rate_hertz: 24000,
      });
      assert.equal(sent?.body.voice_id, voice);
      assert.equal(sent?.body.timestamp_type, "NONE");
      assert.equal(sent?.body.model_id, undefined);
    });
    await test("NDJSON chunks and final metadata return raw PCM", async () => {
      responseBody = [
        JSON.stringify({
          result: { audioContent: pcm.subarray(0, 4).toString("base64") },
        }),
        JSON.stringify({
          backendResponse: {
            result: { audioContent: pcm.subarray(4).toString("base64") },
          },
        }),
        JSON.stringify({ timestampInfo: [] }),
      ].join("\n");
      const result = await generate({ format: "pcm16", speed: 1.5 });
      assert.equal(result.ttsMetadata?.success, true);
      assert.equal(result.audio?.format, "pcm16");
      assert.deepEqual(result.audio?.buffer, pcm);
      assert.equal(requests.at(-1)?.body.speed, 1.5);
    });
    await test("Nested SDK envelope and WAV input preserve PCM", async () => {
      responseBody = JSON.stringify({
        result: {
          audioContent: Buffer.from(
            JSON.stringify({
              result: {
                audioContent: wav?.toString("base64"),
              },
            }),
          ).toString("base64"),
        },
      });
      const result = await generate({ format: "pcm16" });
      assert.equal(result.ttsMetadata?.success, true);
      assert.deepEqual(result.audio?.buffer, pcm);
    });
    for (const [label, body] of [
      [
        "a later error record",
        JSON.stringify({ result: { audioContent: pcm.toString("base64") } }) +
          '\n{"success":false}',
      ],
      ["invalid base64", '{"audio_base64":"%%%"}'],
      ["missing audio", '{"success":true}'],
      [
        "odd PCM bytes",
        JSON.stringify({ audio_base64: Buffer.from([1]).toString("base64") }),
      ],
      [
        "incorrect rate",
        JSON.stringify({
          audio_base64: pcm.toString("base64"),
          sample_rate: 16000,
        }),
      ],
      [
        "compressed format",
        JSON.stringify({
          audio_base64: pcm.toString("base64"),
          encoding: "mp3",
        }),
      ],
      ["invalid JSON", "{broken"],
    ]) {
      await test(`generate reports ${label} as failed synthesis`, async () => {
        responseBody = body;
        const result = await generate();
        assert.equal(result.ttsMetadata?.success, false);
        assert.equal(result.audio, undefined);
      });
    }
    await test("Invalid options never reach HTTP", async () => {
      const before = requests.length;
      for (const options of [
        { voice: "not-a-uuid" },
        { speed: 3 },
        { format: "mp3" as const },
      ]) {
        const result = await generate(options);
        assert.equal(result.ttsMetadata?.success, false);
      }
      assert.equal(requests.length, before);
    });
    await test("Permanent HTTP failures are not retryable", async () => {
      status = 401;
      const before = requests.length;
      await assert.rejects(
        TTSProcessor.synthesize("Check.", "sixtydb", { voice }),
        (error: unknown) =>
          error instanceof TTSError && error.retriable === false,
      );
      assert.equal(requests.length, before + 1);
      status = 200;
    });
    await test("Response-body timeout closes the unfinished HTTP stream", async () => {
      hangBody = true;
      const before = requests.length;
      const started = Date.now();
      try {
        await assert.rejects(
          TTSProcessor.synthesize("Check.", "sixtydb", { voice }),
          (error: unknown) =>
            error instanceof TTSError &&
            !error.retriable &&
            error.message.includes("timed out"),
        );
        assert.equal(requests.length, before + 1);
        assert(Date.now() - started >= 29_000);
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert(hangingBodyClosed);
      } finally {
        hangBody = false;
      }
    });
    await test("Voice discovery loads both tiers and caches before filtering", async () => {
      const before = requests.length;
      const voices = await TTSProcessor.getVoices("sixtydb");
      assert.deepEqual(
        voices.map((item) => item.id),
        [voice, fastVoice],
      );
      assert.equal(requests.length, before + 2);
      const filtered = await TTSProcessor.getVoices("sixtydb", {
        languageCode: "HI",
      });
      assert.deepEqual(
        filtered.map((item) => item.id),
        [fastVoice],
      );
      assert.equal(requests.length, before + 2);
    });
  } finally {
    if (priorKey === undefined) {
      delete process.env.SIXTYDB_API_KEY;
    } else {
      process.env.SIXTYDB_API_KEY = priorKey;
    }
    if (priorVoice === undefined) {
      delete process.env.SIXTYDB_DEFAULT_VOICE;
    } else {
      process.env.SIXTYDB_DEFAULT_VOICE = priorVoice;
    }
    TTSProcessor.clearHandlers();
    for (const [name, handler] of priorHandlers) {
      if (handler) {
        TTSProcessor.registerHandler(name, handler);
      }
    }
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
