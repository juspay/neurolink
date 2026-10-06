// Copy to config.js (gitignored) and fill in. With the NeuroLink transport off, everything is called
// straight from the browser; with it on (Settings), transcription and correction go through the server.
window.ASR_CONFIG = {
  // NeuroLink server (`neurolink serve --port 8788 -c serve.json`, see README). When set, Settings →
  // "Transcribe through NeuroLink server" defaults to on; the toggle is kept per browser.
  neurolinkBaseUrl: "http://127.0.0.1:8788",
  neurolinkToken: "", // optional: the server's NEUROLINK_SERVER_AUTH_TOKEN (Bearer + ?token= on the WebSocket)
  // The page's engines → the server's STT provider names (NEUROLINK_STT_ENDPOINTS keys or built-ins).
  neurolinkProviders: {
    local: "spark",
    indic: "indic",
    whistle: "whistle",
    scribe: "elevenlabs-stt",
  },
  neurolinkDiarizedModel: "qwen3-asr-diarized", // Files → Spark column asks for `<local provider>/<this model>` with diarize=1
  // LiteLLM that fronts the self-hosted models (Qwen3-ASR on the DGX Spark, S2-Pro TTS on the 4090).
  baseUrl: "https://litellm-host:4000", // HTTPS: the key below travels as a Bearer token on every request
  apiKey: "sk-...", // a LiteLLM virtual key that can see the models below
  model: "qwen3-asr", // /v1/audio/transcriptions
  diarizedModel: "qwen3-asr-diarized", // Nemotron-3 diarization + Qwen3-ASR sidecar (Files tab)
  ttsModel: "s2-pro", // /v1/audio/speech; voices listed at /s2pro/voices
  // AI4Bharat IndicConformer-600M wrapper (indic-conformer/serve.sh) on this machine. 22 Indian
  // languages, native script, auto language detection from the CTC head.
  indicBaseUrl: "http://127.0.0.1:8007",
  indicDecoder: "rnnt",
  // Cactus Whistle runs in the browser from public/whistle/ (see README). Keyword biasing loops on
  // long dictionaries; leave off unless you want to try it.
  whistleKeywords: false,
  // Cloud reference: ElevenLabs Scribe, called directly (their API sends CORS headers).
  elevenlabsKey: "",
  scribeModel: "scribe_v2",
  // Corrector: an OpenAI-compatible chat model for the rewrite pass (keep Hindi as Hindi, fix English
  // spelling, punctuation, apply the dictionary). A fast model matters more than a big one.
  correctorBaseUrl: "https://your-litellm-gateway",
  correctorKey: "sk-...",
  correctorModel: "<fast-chat-model>",
  // Decision model (System One API, e.g. XOR behind a LiteLLM alias): guards every
  // dictionary substitution — "part of the plan" stays "part", "my name is Prem" is not turned into "prem" (a dictionary alias).
  decisionBaseUrl: "https://your-litellm-gateway",
  decisionKey: "sk-...",
  decisionModel: "<decision-model>",
};
