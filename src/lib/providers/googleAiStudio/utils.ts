import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { ERROR_CODES, NeuroLinkError } from "../../utils/errorHandling.js";
import type { GenAIClient, GoogleGenAIClass } from "../../types/index.js";

export async function createGoogleGenAIClient(
  apiKey: string,
): Promise<GenAIClient> {
  const mod: unknown = await import("@google/genai");
  const ctor = (mod as Record<string, unknown>).GoogleGenAI as unknown;
  if (!ctor) {
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message: "@google/genai does not export GoogleGenAI",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { module: "@google/genai", expectedExport: "GoogleGenAI" },
    });
  }
  const Ctor = ctor as GoogleGenAIClass;
  return new Ctor({ apiKey });
}
