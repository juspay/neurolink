import { OllamaModels } from "../../constants/enums.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";

export const DEFAULT_OLLAMA_MODEL = OllamaModels.LLAMA3_2_LATEST;

export const FALLBACK_OLLAMA_MODEL = "llama3.2:latest";

export const proxyFetch = createProxyFetch();
