import type { OllamaHttpError } from "../../types/index.js";
import { ProviderError } from "../../types/index.js";
import { DEFAULT_OLLAMA_MODEL } from "./constants.js";

export function isOllamaHttpError(error: unknown): error is OllamaHttpError {
  return (
    error instanceof ProviderError &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    typeof (error as { responseBody?: unknown }).responseBody === "string"
  );
}

export async function createOllamaHttpError(
  response: Response,
): Promise<OllamaHttpError> {
  let responseBody = "";
  try {
    responseBody = (await response.text()).trim();
  } catch {
    // Ignore unreadable bodies
  }

  const suffix = responseBody ? ` - ${responseBody.slice(0, 500)}` : "";
  const error = new ProviderError(
    `Ollama API error: ${response.status} ${response.statusText}${suffix}`,
    "ollama",
  ) as OllamaHttpError;
  error.statusCode = response.status;
  error.statusText = response.statusText;
  error.responseBody = responseBody;
  return error;
}

export const getOllamaBaseUrl = (): string => {
  return process.env.OLLAMA_BASE_URL || "http://localhost:11434";
};

export const isOpenAICompatibleMode = (): boolean => {
  return process.env.OLLAMA_OPENAI_COMPATIBLE === "true";
};

export const createAbortSignalWithTimeout = (
  timeoutMs: number,
): AbortSignal => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeoutId);
  });

  return controller.signal;
};

export const getDefaultOllamaModel = (): string => {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
};

export const getOllamaTimeout = (): number => {
  return parseInt(process.env.OLLAMA_TIMEOUT || "240000", 10);
};
