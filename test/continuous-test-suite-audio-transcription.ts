#!/usr/bin/env tsx
/**
 * Continuous Test Suite: audio attachments reach the model as transcript
 * (#401 / #409 / #413 / #416 / #440 / #471 — pure, no API, all HTTP mocked).
 *
 * ## What this suite proves
 *
 * An audio file attached to `generate()` is transcribed on the way in, and
 * the transcript — not merely "there was an audio file" — is what the model
 * receives. Every assertion below reads the *outgoing provider request*, the
 * only place that claim is observable from outside the SDK.
 *
 * The audio pipeline was largely built already: `FileDetector` routed `audio`
 * to `AudioProcessor`, which already spoke to Whisper. What was missing is
 * what this suite pins down:
 *
 *   - #413 the backend was hard-wired to Whisper — no selection, no way to
 *     ask for Google or Azure, and no report when a requested one is absent.
 *   - #440 `FileDetectorOptions.audioOptions` existed as a type and had zero
 *     readers, so a caller's provider/language/prompt was silently dropped.
 *   - #409 `FileProcessingResult.metadata` carried no audio fields, and
 *     `processAudioFile` returned `detection.metadata` untouched, discarding
 *     the duration and transcript facts the processor had just produced.
 *   - #416 `verbose_json` was requested but only `text` was read back, so the
 *     language and duration Whisper returned were parsed and thrown away.
 *   - #471 nothing told the model the audio had been transcribed for it.
 *
 * ## Why the fixture is a hand-built WAV
 *
 * `makeAudioFile` shells out to ffmpeg, which is deliberately not installed
 * in this repo's CI, so a suite built on it can only skip there. `makeWavFile`
 * emits a canonical RIFF header plus PCM samples directly, which `music-metadata`
 * parses for real — so this suite runs everywhere, and the metadata assertions
 * below are about a genuinely demuxed file rather than a stub.
 *
 * ## Why the transcript token is random
 *
 * The transcript the mocked Whisper endpoint returns carries an un-guessable
 * token, and the assertion is that the token appears in the *chat* request
 * body. A model — or a test — cannot produce it without the transcription
 * having actually flowed through into the prompt. Asserting merely that the
 * request body is non-empty, or that it mentions "audio", would pass with the
 * transcription step entirely removed.
 *
 * ## Preconditions are asserted, not assumed
 *
 * Every "X reached the model" assertion is preceded by a check that the
 * request under test was actually sent. An empty `handle.calls` would
 * otherwise make the negative assertions vacuously true — the failure mode
 * this repo has hit repeatedly, where "nothing happened" reads as "the thing
 * did not happen".
 *
 * Run: npx tsx test/continuous-test-suite-audio-transcription.ts
 */
import * as fs from "node:fs";
import {
  defineSuite,
  assert,
  assertEqual,
  tempDir,
  Skip,
} from "./helpers/harness.js";
import {
  hasFfmpeg,
  makeVideoFile,
  makeWavFile,
} from "./helpers/mediaFixtures.js";
import { installMockFetch } from "./utils/mockFetch.js";
import { logger, NeuroLink } from "../dist/index.js";

const { test, runSuite } = defineSuite("Audio transcription intake (#401)", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Environment. The suite runs in its own tsx process, so these don't leak.
// LiteLLM carries the chat leg because it is a plain OpenAI-wire provider
// whose baseURL can be pointed at a mock host through `credentials`; the
// transcription leg is a separate host so the two are never confused.
// ---------------------------------------------------------------------------
process.env.LITELLM_API_KEY = "sk-litellm-test-mock";
delete process.env.LITELLM_BASE_URL;
// LiteLLM defaults generate() to the SSE wire; this suite's mock returns a
// single JSON body, so force the plain JSON wire via the documented escape
// hatch. Without it every assertion fails on an empty response rather than on
// anything these issues touch.
process.env.NEUROLINK_LITELLM_SSE_GENERATE = "false";

const CHAT_HOST = "mock-litellm-audio.test";
const WHISPER_HOST = "mock-openai-audio.test";
const CREDENTIALS = {
  litellm: {
    apiKey: "sk-litellm-test-mock",
    baseURL: `https://${CHAT_HOST}/v1`,
  },
};

/**
 * Un-guessable marker carried by the mocked transcript. Nothing in the prompt
 * contains it, so its presence in the chat request can only come from the
 * transcription having been inlined.
 */
const TRANSCRIPT_TOKEN = "ZQ7X4M2K9WB3";
const MOCK_TRANSCRIPT = `The access phrase for this recording is ${TRANSCRIPT_TOKEN}.`;

/** Reset every credential the selector reads, so each case starts from zero. */
function clearTranscriptionEnv(): void {
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.AZURE_SPEECH_KEY;
  delete process.env.AZURE_SPEECH_REGION;
}

function openAIChatResponse(content: string, model: string): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

/** Whisper's `verbose_json` shape, trimmed to the fields the processor reads. */
function whisperVerboseResponse(): unknown {
  return {
    task: "transcribe",
    language: "english",
    duration: 1.0,
    text: MOCK_TRANSCRIPT,
    segments: [],
  };
}

const workDir = tempDir("neurolink-audio-");
const wavPath = makeWavFile(workDir, "briefing.wav", 1, 16000);

/** Whole outgoing chat request as text, for content assertions. */
function chatRequestText(calls: { url: string; bodyText: string }[]): string {
  return calls
    .filter((c) => c.url.includes("/chat/completions"))
    .map((c) => c.bodyText)
    .join("\n");
}

/** Image content parts of the user message in an outgoing chat request. */
function imagePartsOf(body: unknown): { type?: string }[] {
  const messages =
    (body as { messages?: { role?: string; content?: unknown }[] } | undefined)
      ?.messages ?? [];
  const userMessage = messages.find((m) => m.role === "user");
  const content = userMessage?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  return (content as { type?: string }[]).filter((p) => p.type === "image_url");
}

function transcriptionCalls(calls: { url: string }[]): { url: string }[] {
  return calls.filter((c) => c.url.includes("/audio/transcriptions"));
}

async function generateWithAudio(
  handleCalls: () => void,
  audioOptions?: Record<string, string>,
): Promise<void> {
  handleCalls();
  const nl = new NeuroLink();
  await nl.generate({
    input: {
      text: "What access phrase is spoken in this recording?",
      files: [wavPath],
    },
    provider: "litellm",
    model: "openai/gpt-4o-mini",
    disableTools: true,
    credentials: CREDENTIALS,
    ...(audioOptions ? { audioOptions } : {}),
  });
}

// ---------------------------------------------------------------------------
// 1. The core claim: an attached audio file is transcribed and the transcript
//    reaches the model (#416 wire, #440 routing, #471 guidance).
// ---------------------------------------------------------------------------

await test("generate() with an attached WAV transcribes it and inlines the transcript into the provider request", async () => {
  clearTranscriptionEnv();
  process.env.OPENAI_API_KEY = "sk-openai-test-mock";
  process.env.OPENAI_BASE_URL = `https://${WHISPER_HOST}/v1`;

  const handle = installMockFetch([
    {
      method: "POST",
      url: `${WHISPER_HOST}/v1/audio/transcriptions`,
      respond: { status: 200, json: whisperVerboseResponse() },
    },
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: {
        text: "What access phrase is spoken in this recording?",
        files: [wavPath],
      },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableTools: true,
      credentials: CREDENTIALS,
    });

    // Precondition 1: the transcription endpoint was actually called. Without
    // this, a pipeline that never transcribes would still satisfy nothing
    // below by accident — but it makes the failure legible.
    assertEqual(
      transcriptionCalls(handle.calls).length,
      1,
      "the audio attachment must trigger exactly one transcription request",
    );

    // Precondition 2: the chat request was actually sent.
    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );

    assert(
      String(result.content).includes("answered"),
      "generate() must return the mocked provider response",
    );

    // The load-bearing assertion. The token exists nowhere but the mocked
    // transcript, so this fails if transcription is skipped, if the
    // transcript is dropped, or if only metadata is forwarded.
    assert(
      chatText.includes(TRANSCRIPT_TOKEN),
      "the transcript produced for the attached audio must be present in the outgoing chat request",
    );

    // #471: the model is told the audio was transcribed for it. This is the
    // text-only branch of the message builder, which carries the guidance
    // via the file-handling augmentation; the multimodal branch has its own
    // copy, asserted separately below.
    assert(
      chatText.includes("ALREADY BEEN PROCESSED"),
      "the system prompt must state that attached audio was already processed",
    );
    assert(
      chatText.includes("unable to process audio"),
      "the system prompt must tell the model not to claim it cannot process audio",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 2. #409: audio metadata survives the detector boundary.
//    Observable from outside only via the text the processor inlines, which is
//    what `FileProcessingResult.content` carries into the prompt.
// ---------------------------------------------------------------------------

await test("the inlined audio summary carries demuxed metadata alongside the transcript", async () => {
  clearTranscriptionEnv();
  process.env.OPENAI_API_KEY = "sk-openai-test-mock";
  process.env.OPENAI_BASE_URL = `https://${WHISPER_HOST}/v1`;

  const handle = installMockFetch([
    {
      method: "POST",
      url: `${WHISPER_HOST}/v1/audio/transcriptions`,
      respond: { status: 200, json: whisperVerboseResponse() },
    },
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    await generateWithAudio(() => undefined);

    assertEqual(
      transcriptionCalls(handle.calls).length,
      1,
      "the audio attachment must trigger exactly one transcription request",
    );
    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );

    // The fixture is a 1s 16kHz PCM WAV, so the demuxer reports a real
    // duration and codec. Both come from music-metadata, not from the
    // transcription response.
    assert(
      chatText.includes("Audio File"),
      "the audio summary heading must be inlined into the prompt",
    );
    assert(
      chatText.includes("PCM"),
      "the demuxed codec must appear in the inlined audio summary",
    );
    assert(
      chatText.includes("Transcript"),
      "the inlined audio summary must carry a transcript section",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 3. #413: auto-selection falls through to a non-OpenAI backend.
//    With no OPENAI_API_KEY but Azure configured, the Azure endpoint must be
//    the one called — previously nothing was called at all.
// ---------------------------------------------------------------------------

await test("with no OpenAI key but Azure configured, transcription auto-selects the Azure backend", async () => {
  clearTranscriptionEnv();
  process.env.AZURE_SPEECH_KEY = "azure-test-mock";
  process.env.AZURE_SPEECH_REGION = "eastus";

  const handle = installMockFetch([
    {
      method: "POST",
      url: "stt.speech.microsoft.com",
      respond: {
        status: 200,
        json: {
          RecognitionStatus: "Success",
          DisplayText: MOCK_TRANSCRIPT,
          Offset: 0,
          Duration: 10_000_000,
        },
      },
    },
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    await generateWithAudio(() => undefined);

    // Precondition: Azure was actually reached. This is the assertion that
    // distinguishes "auto-selection fell through to Azure" from "nothing
    // was attempted", which look identical in the prompt otherwise.
    const azureCalls = handle.calls.filter((c) =>
      c.url.includes("stt.speech.microsoft.com"),
    );
    assertEqual(
      azureCalls.length,
      1,
      "auto-selection must reach the Azure speech endpoint when it is the only configured backend",
    );
    assertEqual(
      transcriptionCalls(handle.calls).length,
      0,
      "no OpenAI transcription request may be sent when no OpenAI key is set",
    );

    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );
    assert(
      chatText.includes(TRANSCRIPT_TOKEN),
      "the Azure-produced transcript must be inlined into the outgoing chat request",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 4. #413 + #440: a caller-pinned backend is honoured, not silently swapped.
//    Both backends are configured; the caller asks for Azure; OpenAI must not
//    be called even though it sorts first in the auto-selection order.
// ---------------------------------------------------------------------------

await test("audioOptions.provider pins the backend instead of letting auto-selection win", async () => {
  clearTranscriptionEnv();
  process.env.OPENAI_API_KEY = "sk-openai-test-mock";
  process.env.OPENAI_BASE_URL = `https://${WHISPER_HOST}/v1`;
  process.env.AZURE_SPEECH_KEY = "azure-test-mock";
  process.env.AZURE_SPEECH_REGION = "eastus";

  const handle = installMockFetch([
    {
      method: "POST",
      url: `${WHISPER_HOST}/v1/audio/transcriptions`,
      respond: { status: 200, json: whisperVerboseResponse() },
    },
    {
      method: "POST",
      url: "stt.speech.microsoft.com",
      respond: {
        status: 200,
        json: {
          RecognitionStatus: "Success",
          DisplayText: MOCK_TRANSCRIPT,
          Offset: 0,
          Duration: 10_000_000,
        },
      },
    },
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    await generateWithAudio(() => undefined, { provider: "azure" });

    const azureCalls = handle.calls.filter((c) =>
      c.url.includes("stt.speech.microsoft.com"),
    );
    // Precondition for the negative assertion below: prove the pinned
    // backend ran at all, so "OpenAI was not called" cannot be satisfied by
    // a run in which no transcription happened.
    assertEqual(
      azureCalls.length,
      1,
      "the caller-pinned Azure backend must be the one called",
    );
    assertEqual(
      transcriptionCalls(handle.calls).length,
      0,
      "the auto-selection default must not be used when the caller pinned a different backend",
    );

    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.includes(TRANSCRIPT_TOKEN),
      "the pinned backend's transcript must be inlined into the outgoing chat request",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 5. #413 + #416: no backend configured degrades to metadata plus a stated
//    reason, rather than an indistinguishable silent skip.
// ---------------------------------------------------------------------------

await test("with no transcription backend configured, the audio still reaches the model as metadata and no transcription is attempted", async () => {
  clearTranscriptionEnv();

  const handle = installMockFetch([
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    await generateWithAudio(() => undefined);

    // Precondition: the run actually reached the provider. Without this the
    // "no transcription was attempted" assertion below would also hold for a
    // run that threw before any file was processed.
    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );
    assert(
      chatText.includes("Audio File"),
      "the audio file must still be inlined as metadata when no backend is configured",
    );

    assertEqual(
      transcriptionCalls(handle.calls).length,
      0,
      "no transcription request may be sent when no backend credentials are present",
    );
    assert(
      !chatText.includes(TRANSCRIPT_TOKEN),
      "no transcript content may appear when transcription never ran",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 6. #413: an unavailable pinned backend is reported, not quietly replaced by
//    a configured one.
// ---------------------------------------------------------------------------

await test("a pinned backend that is not configured falls back to metadata rather than silently using an available one", async () => {
  clearTranscriptionEnv();
  // OpenAI is available; the caller asks for Google, which is not.
  process.env.OPENAI_API_KEY = "sk-openai-test-mock";
  process.env.OPENAI_BASE_URL = `https://${WHISPER_HOST}/v1`;

  const handle = installMockFetch([
    {
      method: "POST",
      url: `${WHISPER_HOST}/v1/audio/transcriptions`,
      respond: { status: 200, json: whisperVerboseResponse() },
    },
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    await generateWithAudio(() => undefined, { provider: "google" });

    // Precondition: the run completed and produced a request, so the
    // negative assertion below is about a real run.
    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );
    assert(
      chatText.includes("Audio File"),
      "the audio file must still be inlined as metadata",
    );

    assertEqual(
      transcriptionCalls(handle.calls).length,
      0,
      "an unavailable pinned backend must not be swapped for a configured one",
    );
    assert(
      !chatText.includes(TRANSCRIPT_TOKEN),
      "no transcript content may appear when the pinned backend was unavailable",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 7. #471 on the multimodal branch. `buildMultimodalSystemPrompt` is a second,
//    separate copy of the file-handling guidance, reached only when the request
//    is actually multimodal — an audio-plus-text turn takes the text-only
//    branch and never touches it. Attaching an image alongside the audio is
//    what routes through it, and it is the branch that owns the file-type list
//    the issue asks for.
// ---------------------------------------------------------------------------

await test("on the multimodal branch the file-type list names transcribed audio", async () => {
  clearTranscriptionEnv();
  process.env.OPENAI_API_KEY = "sk-openai-test-mock";
  process.env.OPENAI_BASE_URL = `https://${WHISPER_HOST}/v1`;

  const handle = installMockFetch([
    {
      method: "POST",
      url: `${WHISPER_HOST}/v1/audio/transcriptions`,
      respond: { status: 200, json: whisperVerboseResponse() },
    },
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: {
        text: "What access phrase is spoken in this recording?",
        files: [wavPath],
        images: [fs.readFileSync("test/fixtures/sample-screenshot.png")],
      },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableTools: true,
      credentials: CREDENTIALS,
    });

    // Precondition: transcription ran, so the audio genuinely took part in
    // this request rather than being dropped before the prompt was built.
    assertEqual(
      transcriptionCalls(handle.calls).length,
      1,
      "the audio attachment must trigger exactly one transcription request",
    );
    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );

    // Precondition for reading the multimodal branch at all: an image part
    // means the request really did route through the multimodal builder.
    assert(
      chatText.includes("image_url"),
      "the request must carry an image part, proving the multimodal branch was taken",
    );

    assert(
      chatText.includes("audio files (transcribed)"),
      "the multimodal file-type list must name transcribed audio",
    );
    assert(
      chatText.includes("ALREADY BEEN PROCESSED"),
      "the multimodal system prompt must state that attached audio was already processed",
    );
    assert(
      chatText.includes(TRANSCRIPT_TOKEN),
      "the transcript must still be inlined on the multimodal branch",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 8. #1748: videoOptions crosses the same three allowlists.
//
//    Threading audioOptions exposed that videoOptions is dropped identically —
//    and had been since the CLI flags were wired up. It is declared public on
//    GenerateOptions, built by the CLI, and then discarded, because
//    `buildGenerateTextOptions` and both `multimodalOptions` blocks rebuild
//    options field by field and omitted it. `TextGenerationOptions` did not
//    even declare it.
//
//    This case is the one that runs in CI. It proves the option bag survives
//    all three allowlists, using the only videoOptions field observable
//    without ffmpeg. It does NOT prove a value reaches VideoProcessor — case 9
//    does that, and can only run where ffmpeg exists.
//
//    `transcribeAudio` is the probe, not a feature under test: video audio
//    transcription remains unimplemented (#433). The warning is precisely what
//    "accepted but not implemented" is supposed to emit, and it cannot fire at
//    all if the option never arrives.
// ---------------------------------------------------------------------------

await test("videoOptions survives the option allowlists into the message builder", async () => {
  clearTranscriptionEnv();

  const handle = installMockFetch([
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("answered", "openai/gpt-4o-mini"),
      },
    },
  ]);
  const originalWarn = logger.warn.bind(logger);
  const warnings: string[] = [];
  logger.warn = (...args: unknown[]): void => {
    warnings.push(args.map((a) => String(a)).join(" "));
  };
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "Summarise the attachment", files: [wavPath] },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableTools: true,
      credentials: CREDENTIALS,
      // Non-default: the field is undefined unless a caller sets it.
      videoOptions: { transcribeAudio: true },
    });

    // Precondition: the run reached the provider, so a missing warning below
    // means "the option was dropped", not "nothing ran".
    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );
    // Precondition: the logger spy is actually observing this code path.
    assert(
      warnings.length > 0,
      "the run must have emitted at least one warning for the spy to observe",
    );

    assert(
      warnings.some((w) => w.includes("Video audio transcription")),
      "the video-transcription notice must fire, proving videoOptions crossed every option allowlist",
    );
  } finally {
    logger.warn = originalWarn;
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 9. #1748, the real claim: a NON-DEFAULT videoOptions value reaches
//    VideoProcessor and changes its output.
//
//    Asserting a default would prove nothing — a dropped option and a correct
//    default are indistinguishable, which is exactly why this survived
//    unnoticed. A 6-second clip falls in VideoProcessor's 1s-interval band, so
//    its default is ~6 keyframes; asking for 2 is unambiguously the caller's
//    value and not a default.
//
//    ffmpeg is deliberately not installed in this repo's CI, so this skips
//    there rather than failing. Case 8 is the CI-gating half.
// ---------------------------------------------------------------------------

await test("a non-default videoOptions.frames reaches VideoProcessor and sets the keyframe count", async () => {
  if (!(await hasFfmpeg())) {
    throw new Skip(
      "ffmpeg is unavailable here; it is deliberately not installed in CI",
    );
  }
  clearTranscriptionEnv();

  const videoPath = await makeVideoFile(workDir, "clip.mp4", 6);
  const REQUESTED_FRAMES = 2;

  const handle = installMockFetch([
    {
      method: "POST",
      url: CHAT_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("described", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "Describe this clip", files: [videoPath] },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableTools: true,
      credentials: CREDENTIALS,
      videoOptions: { frames: REQUESTED_FRAMES },
    });

    const chatCalls = handle.calls.filter((c) =>
      c.url.includes("/chat/completions"),
    );
    // Precondition: exactly one request, so the count below is not a sum
    // across retries.
    assertEqual(
      chatCalls.length,
      1,
      "exactly one chat-completions request must have been sent",
    );

    const parts = imagePartsOf(chatCalls[0].bodyJson);
    // Precondition: keyframe extraction produced something at all. Without
    // this, a run where ffmpeg or sharp silently yielded zero frames would
    // make an equality check against a small number look like a near miss
    // rather than "extraction did not happen".
    assert(
      parts.length > 0,
      "keyframe extraction must have produced at least one frame",
    );

    assertEqual(
      parts.length,
      REQUESTED_FRAMES,
      "the caller's non-default frame budget must be the keyframe count, not the duration-derived default",
    );
  } finally {
    handle.unset();
  }
});

await runSuite(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});
