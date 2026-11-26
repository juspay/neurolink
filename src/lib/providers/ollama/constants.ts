import { createProxyFetch } from "../../proxy/proxyFetch.js";
import { getDefaultModel } from "../rules/fallbackModel.js";

export const DEFAULT_OLLAMA_MODEL = getDefaultModel("ollama");

export const proxyFetch = createProxyFetch();
