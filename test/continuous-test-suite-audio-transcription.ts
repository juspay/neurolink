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
import * as path from "node:path";
import ts from "typescript";
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
// The shipped `@juspay/neurolink/processors` entry. dist is emitted per module,
// so this resolves to the same AudioProcessor module dist/index.js loads — one
// module graph, not a second copy.
import { processAudio } from "../dist/processors/index.js";

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
const AZURE_STT_HOST = "stt.speech.microsoft.com";
const CREDENTIALS = {
  litellm: {
    apiKey: "sk-litellm-test-mock",
    baseURL: `https://${CHAT_HOST}/v1`,
  },
};

/**
 * True when `url`'s actual hostname is the Azure speech endpoint (or a
 * region subdomain of it, e.g. `eastus.stt.speech.microsoft.com`) — parsed
 * from the URL, not matched as a substring, so a host like
 * `evil-stt.speech.microsoft.com.attacker.test` cannot pass.
 */
function isAzureSttUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  return hostname === AZURE_STT_HOST || hostname.endsWith(`.${AZURE_STT_HOST}`);
}

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
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
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
    const azureCalls = handle.calls.filter((c) => isAzureSttUrl(c.url));
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

    const azureCalls = handle.calls.filter((c) => isAzureSttUrl(c.url));
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

    // AUDIO_TRANSCRIPTION_INSTRUCTIONS (messageBuilder.ts) tells the model
    // that when transcription is skipped, "the stated reason is inlined with
    // it". Without this, the model is left to guess why there is no
    // transcript, and the "no transcription backend configured" case
    // reported live as a model hallucinating an answer it had no basis for.
    assert(
      chatText.includes("no transcription backend is configured"),
      "the skip reason must be inlined into the prompt when no transcription backend is configured, matching what AUDIO_TRANSCRIPTION_INSTRUCTIONS promises the model",
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

    // Same promise as the auto-select case above: the model is told the skip
    // reason is inlined, so it must actually be there for the pinned-backend
    // rejection path too. chatText is the raw outgoing JSON body text (see
    // chatRequestText), so a literal quote inside the inlined message content
    // appears here backslash-escaped, as the wire bytes actually read.
    assert(
      chatText.includes(
        'transcription provider \\"google\\" was requested but is not configured',
      ),
      "the skip reason must be inlined into the prompt when the caller's pinned backend lacks credentials",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 5b. F1: GOOGLE_APPLICATION_CREDENTIALS alone must be treated as a
//    configured Google backend. GoogleSTT (voice/providers/GoogleSTT.ts,
//    pre-existing) accepts a service-account file as independent of any API
//    key (`isConfigured()` returns true for either), but
//    TRANSCRIPTION_PROVIDER_CREDENTIALS.google.envVars previously listed only
//    the three API-key aliases, so selectProvider() rejected a
//    credentials-file-only environment as "not configured" even though the
//    handler it delegates to would have authenticated successfully.
//
//    A nonexistent credentials-file path is used deliberately: it keeps the
//    case fully offline (google-auth-library fails on the local file read,
//    before any network call — see GoogleSTT.getAccessToken()) while still
//    proving the *selection* step now recognizes the credential and hands
//    off to the Google handler, rather than short-circuiting with "is not
//    configured".
// ---------------------------------------------------------------------------

await test("a Google service-account credential file alone is recognized as a configured backend", async () => {
  clearTranscriptionEnv();
  // A path that does not exist. `processAudio()` still completes
  // successfully either way — transcription is additive and never blocks
  // processing — and the case is fully offline: google-auth-library fails
  // reading the local file before any network call is ever made (see
  // GoogleSTT.getAccessToken()).
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
    workDir,
    "no-such-google-creds.json",
  );
  try {
    const buffer = fs.readFileSync(wavPath);
    const result = await processAudio(
      {
        id: "google-creds-probe",
        name: "briefing.wav",
        mimetype: "audio/wav",
        size: buffer.length,
        buffer,
      },
      { provider: "google" },
    );

    if (!result.success || result.data === undefined) {
      throw new Error(
        "processAudio() must still succeed on a valid WAV — transcription is additive and never blocks processing",
      );
    }
    const reason = result.data.transcriptionSkippedReason;

    // Negative precondition: the pinned backend must not have been rejected
    // as unconfigured — that rejection is exactly the bug this finding
    // reports, and without ruling it out first the positive assertion below
    // could not tell "recognized, then failed" from "never recognized".
    assert(
      reason === undefined ||
        !reason.includes("was requested but is not configured"),
      "a service-account credential file alone must be enough to select the Google backend, not be rejected as an unconfigured one",
    );

    // Positive proof: selection handed off to the real Google handler, which
    // then failed on its own (offline, file-not-found) token step. Seeing
    // the handler's own failure — rather than a selection-time rejection —
    // is what proves the credential file was recognized and dispatch really
    // reached the handler.
    assert(
      reason !== undefined &&
        reason.includes("access token acquisition failed"),
      "the pinned Google backend must actually have been attempted, proving the service-account credential file was recognized",
    );
  } finally {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
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
      chatText.includes("audio files (transcript may be unavailable)"),
      "the multimodal file-type list must not claim certainty ('transcribed') that a transcript exists, since the same label fires whether or not transcription actually ran",
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
// 7b. R20: the multimodal file-type list must not claim transcription
//    succeeded when it did not run at all. Before the fix, `hasAudioFiles`
//    alone drove the unconditional label "audio files (transcribed)" — this
//    case (no backend configured) is the one CodeRabbit's outside-diff
//    comment named directly: a caller with no transcription backend still
//    saw their audio described to the model as already transcribed.
// ---------------------------------------------------------------------------

await test("R20: the multimodal file-type list does not claim transcription when no backend ran", async () => {
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

    const chatText = chatRequestText(handle.calls);
    assert(
      chatText.length > 0,
      "a chat-completions request must have been sent",
    );
    assert(
      chatText.includes("image_url"),
      "the request must carry an image part, proving the multimodal branch was taken",
    );
    assertEqual(
      transcriptionCalls(handle.calls).length,
      0,
      "no transcription request may be sent when no backend credentials are present",
    );

    assert(
      chatText.includes("audio files (transcript may be unavailable)"),
      "the multimodal file-type list must use the hedged label, not claim the audio 'files (transcribed)' when no transcription backend ran",
    );
    assert(
      !chatText.includes("audio files (transcribed)"),
      "the multimodal file-type list must not claim certainty that audio was transcribed when no backend was configured",
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

// ---------------------------------------------------------------------------
// An empty-but-successful transcription still names its backend.
//    `transcriptionProvider` is how a caller tells "a backend ran and heard no
//    speech" from "no backend ran" — FileDetector keys `transcriptionLength: 0`
//    off it. It never reaches the chat request, so it is read here from
//    `processAudio()` on the shipped processors entry.
// ---------------------------------------------------------------------------

await test("processAudio(): a Whisper call that returns an empty transcript still reports openai-whisper as the provider", async () => {
  clearTranscriptionEnv();
  process.env.OPENAI_API_KEY = "sk-openai-test-mock";
  process.env.OPENAI_BASE_URL = `https://${WHISPER_HOST}/v1`;

  const handle = installMockFetch([
    {
      method: "POST",
      url: `${WHISPER_HOST}/v1/audio/transcriptions`,
      respond: {
        status: 200,
        json: { task: "transcribe", language: "english", text: "" },
      },
    },
  ]);
  try {
    const buffer = fs.readFileSync(wavPath);
    const result = await processAudio({
      id: "empty-transcript",
      name: "briefing.wav",
      mimetype: "audio/wav",
      size: buffer.length,
      buffer,
    });

    // Precondition: the backend really ran. Had it not, an unset provider
    // below would be the correct answer rather than the bug.
    assertEqual(
      transcriptionCalls(handle.calls).length,
      1,
      "the audio must trigger exactly one transcription request",
    );
    const data = result.data;
    if (!result.success || data === undefined) {
      throw new Error("processAudio() must succeed on a valid WAV");
    }
    assert(
      data.hasTranscript === false,
      "an empty transcript must not be reported as a transcript",
    );
    assert(
      data.transcriptionProvider === "openai-whisper",
      "a backend that ran and returned no speech must still be named, or it reads the same as no backend running",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// F2 / duplicate: the CLI's `audioOptions` exclusion comment must not claim a
// CLI surface that does not exist.
//
// This is a documentation-accuracy defect, not a behavioral one: the comment
// text is erased by the compiler and never reaches `dist/`, so there is no
// shipped surface to exercise from the built entry the way every other case
// in this suite does. Reading the two source files as plain text is the only
// place the claim itself can be checked — this is a static consistency check
// on the repository's own documentation-vs-code, not a unit test asserting
// on an internal module's runtime shape.
// ---------------------------------------------------------------------------

await test("optionsSchema's audioOptions comment does not claim CLI flags that commandFactory.ts never defines", async () => {
  const optionsSchemaSrc = fs.readFileSync(
    "src/cli/loop/optionsSchema.ts",
    "utf8",
  );
  const commandFactorySrc = fs.readFileSync(
    "src/cli/factories/commandFactory.ts",
    "utf8",
  );

  const audioOptionsLine = optionsSchemaSrc
    .split("\n")
    .find((line) => line.includes('"audioOptions"'));
  assert(
    audioOptionsLine !== undefined,
    "optionsSchema.ts must still declare an audioOptions exclusion entry",
  );

  // The affirmative claim this finding is about — distinct from a comment
  // that instead says such flags do NOT exist yet, which mentions the same
  // "--audio-*" substring without asserting it.
  const claimsCliFlagsExist = /set via --audio-\* flags/.test(
    audioOptionsLine ?? "",
  );
  const commandFactoryHasAudioFlags = /["'`]--audio-[a-z-]+/i.test(
    commandFactorySrc,
  );

  if (claimsCliFlagsExist) {
    assert(
      commandFactoryHasAudioFlags,
      "the audioOptions comment claims '--audio-* flags' exist, but commandFactory.ts defines no --audio-* flag",
    );
  } else {
    assert(
      !commandFactoryHasAudioFlags,
      "commandFactory.ts now defines --audio-* flags, so the audioOptions comment's silence about them is now itself out of date",
    );
  }
});

// ---------------------------------------------------------------------------
// processAudio() usertest finding: the public standalone wrapper's declared
// parameter type must accept what it actually forwards to processFile().
//
// `processAudio()` (this file, re-exported from the `@juspay/neurolink/processors`
// subpath) is a thin pass-through to `AudioProcessor.processFile()`, which
// this PR widened to `ProcessOptions & AudioProcessorOptions`. Before the
// fix, `processAudio()` kept the pre-PR `options?: ProcessOptions` type, so a
// strict caller passing `provider`/`transcriptionModel`/`language`/`prompt` —
// exactly the options `GenerateOptions.audioOptions` documents as public —
// got a compile error for a parameter the function genuinely accepts and
// uses at runtime.
//
// This is a type-only defect: nothing observable at runtime distinguishes
// the two signatures (JavaScript does not check excess properties), so the
// only way to prove it is a real compile against the shipped declaration,
// using the TypeScript compiler API the same way `scripts/check-shipped-types.ts`
// already does in this repo — not a second copy of the type read out of
// `src/`.
// ---------------------------------------------------------------------------

await test("processAudio()'s declared type accepts the transcription options it forwards to processFile()", async () => {
  const distProcessorsIndex = path.resolve("dist/processors/index.js");
  if (!fs.existsSync(distProcessorsIndex)) {
    throw new Skip(
      "dist/processors/index.js is not built; run `pnpm run build` first",
    );
  }

  const probeDir = tempDir("neurolink-processaudio-typecheck-");
  const probeFile = path.join(probeDir, "probe.ts");
  let importSpecifier = path
    .relative(probeDir, distProcessorsIndex)
    .split(path.sep)
    .join("/");
  if (!importSpecifier.startsWith(".")) {
    importSpecifier = `./${importSpecifier}`;
  }

  fs.writeFileSync(
    probeFile,
    [
      `import { processAudio } from "${importSpecifier}";`,
      "",
      "// Exactly the fields AudioProcessorOptions adds and processFile() (this PR)",
      "// accepts; processAudio() is a thin wrapper over it and must accept the",
      "// same options or a strict caller gets a compile error for a parameter the",
      "// function genuinely forwards at runtime.",
      "void processAudio(",
      '  { id: "probe", name: "probe.wav", mimetype: "audio/wav", size: 0 },',
      "  {",
      '    provider: "azure",',
      '    transcriptionModel: "whisper-1",',
      '    language: "en",',
      '    prompt: "context",',
      "  },",
      ");",
      "",
    ].join("\n"),
  );

  try {
    const program = ts.createProgram([probeFile], {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.file?.fileName === probeFile);
    const messages = diagnostics.map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, " "),
    );

    assert(
      !messages.some((m) =>
        m.includes("does not exist in type 'ProcessOptions'"),
      ),
      "processAudio()'s declared parameter type must accept provider/transcriptionModel/language/prompt, matching what processFile() (and processAudio() itself, at runtime) actually accepts",
    );
  } finally {
    fs.rmSync(probeDir, { recursive: true, force: true });
  }
});

await runSuite(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});
