/**
 * The realtime model factory: builds the LiveKit speech-to-speech model for the
 * configured backend.
 *
 * `gemini` is Gemini Live on Vertex through `@livekit/agents-plugin-google`;
 * `xai` is Grok Voice through `@livekit/agents-plugin-xai`, which speaks the
 * OpenAI realtime protocol to `wss://api.x.ai/v1`. Both plugins and
 * `@google/genai` are imported dynamically so the core package does not require
 * them unless the realtime agent is used.
 *
 * The xai backend was run against the real xAI service on 2026-10-20; what that
 * showed, and what is still unmeasured, is in the document below.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import type { RealtimeLlm, RealtimeVoiceConfig } from "../../types/index.js";
import { requireWebSocketUrl } from "./config.js";
import { observeXaiSession } from "./xaiSessionWatch.js";

/**
 * Fail early, naming the variable, when `XAI_API_KEY` is blank or absent.
 *
 * The plugin reads the key itself and falls back to `OPENAI_API_KEY` when its
 * own is missing, which would send an OpenAI key to the xAI host, so a missing
 * key must stop here. The message never carries a value.
 */
export function requireXaiApiKey(): void {
  const key = process.env.XAI_API_KEY;
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error(
      "XAI_API_KEY is not set; the xai realtime backend reads its key from that environment variable",
    );
  }
}

async function createGeminiRealtimeLlm(
  cfg: RealtimeVoiceConfig,
): Promise<RealtimeLlm> {
  const google = await import("@livekit/agents-plugin-google");
  const { Modality } = await import("@google/genai");

  const modality = Object.values(Modality).find(
    (value) => value === cfg.responseModality,
  );
  const modelOptions: NonNullable<
    ConstructorParameters<typeof google.realtime.RealtimeModel>[0]
  > = {
    vertexai: true,
    model: cfg.model,
    // Emit text transcripts of BOTH sides; LiveKit forwards them to the room.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  if (modality !== undefined) {
    modelOptions.modalities = [modality];
  }
  if (cfg.project) {
    modelOptions.project = cfg.project;
  }
  if (cfg.location) {
    modelOptions.location = cfg.location;
  }
  if (cfg.voice) {
    modelOptions.voice = cfg.voice;
  }
  return new google.realtime.RealtimeModel(modelOptions);
}

async function createXaiRealtimeLlm(
  cfg: RealtimeVoiceConfig,
): Promise<RealtimeLlm> {
  requireXaiApiKey();
  // `cfg` can be built by hand, without `resolveRealtimeVoiceConfig`, so the
  // whole base URL check runs here as well as there: the ws or wss shape, and
  // the cross-host rule that keeps XAI_API_KEY off an unencrypted link. The
  // cross-host rule alone lets an http(s) or unparseable value reach the plugin.
  if (cfg.xaiBaseURL) {
    requireWebSocketUrl(cfg.xaiBaseURL, "xaiBaseURL");
  }
  const xai = await import("@livekit/agents-plugin-xai");

  // Keys are added only when set. The plugin spreads these options over its
  // own defaults, so a key holding `undefined` would erase the default: a
  // missing `baseURL` would send the xAI key to OPENAI_BASE_URL or
  // api.openai.com, and no `apiKey` option is passed at all because the plugin
  // reads XAI_API_KEY itself. The plugin forwards `baseURL` and
  // `inputAudioTranscription` although its declared option type leaves them out.
  //
  // `inputAudioTranscription` is the one key set to `undefined` on purpose, to
  // erase the plugin's OpenAI default of `gpt-4o-mini-transcribe`. With it xAI
  // answered one spoken utterance with five "completed" transcripts, which the
  // turn recorder stored as one user message with the utterance repeated;
  // without it xAI sends one. `undefined`, unlike `null`, keeps the plugin's
  // user-transcription capability on, and JSON.stringify leaves the key out of
  // the `session.update` it sends.
  const modelOptions: NonNullable<
    ConstructorParameters<typeof xai.realtime.RealtimeModel>[0]
  > & { baseURL?: string; inputAudioTranscription?: undefined } = {
    model: cfg.model,
    inputAudioTranscription: undefined,
  };
  if (cfg.voice) {
    modelOptions.voice = cfg.voice;
  }
  if (cfg.xaiBaseURL) {
    modelOptions.baseURL = cfg.xaiBaseURL;
  }

  class ObservedXaiRealtimeModel extends xai.realtime.RealtimeModel {
    session() {
      const session = super.session();
      observeXaiSession(session, cfg.model);
      return session;
    }
  }
  return new ObservedXaiRealtimeModel(modelOptions);
}

/**
 * Build the realtime model for `cfg.backend`.
 *
 * The gemini branch builds exactly what the agent has always built: Vertex AI,
 * the configured model, transcripts of both sides, and project, location,
 * voice and modality when set. The xai branch needs `XAI_API_KEY` in the
 * environment and throws before touching the plugin when it is missing. It then
 * checks `xaiBaseURL` as config resolution does, and throws before touching the
 * plugin for a value that is not a `ws://` or `wss://` URL, and for a `ws://`
 * URL to a host other than localhost, 127.0.0.0/8 or [::1] unless
 * `XAI_REALTIME_ALLOW_INSECURE=true`. That opt-in never admits a value that is
 * not a ws or wss URL. The errors name `xaiBaseURL` and do not repeat the value.
 */
export async function createRealtimeLlm(
  cfg: RealtimeVoiceConfig,
): Promise<RealtimeLlm> {
  switch (cfg.backend) {
    case "gemini":
      return createGeminiRealtimeLlm(cfg);
    case "xai":
      return createXaiRealtimeLlm(cfg);
    default:
      throw new Error('The realtime backend must be "gemini" or "xai"');
  }
}
