/**
 * The credentials slice that makes `STTProcessor.resolveHandler` build the
 * provider's handler from the environment as it is NOW, rather than reuse a
 * registry instance built when the process started. The OpenAI-compatible
 * handler additionally honours `OPENAI_BASE_URL`, which file transcription
 * (audio attachments, video audio tracks) has always followed — a gateway
 * that fronts both chat and `/audio/transcriptions`; `OPENAI_STT_BASE_URL`
 * still wins over it. Shared by AudioProcessor and VideoProcessor so the two
 * can never resolve different endpoints.
 */
import type { STTCredentials } from "../types/index.js";

export function freshEnvSTTCredentials(
  credentialsKey: keyof STTCredentials,
): STTCredentials {
  const credentials: STTCredentials = {};
  if (credentialsKey === "whisper") {
    const baseURL =
      process.env.OPENAI_STT_BASE_URL?.trim() ||
      process.env.OPENAI_BASE_URL?.trim();
    credentials.whisper = baseURL ? { baseURL } : {};
  } else if (credentialsKey !== "endpoints") {
    credentials[credentialsKey] = {};
  }
  return credentials;
}
