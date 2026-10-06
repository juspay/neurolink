[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhisperModel

# Type Alias: WhisperModel

> **WhisperModel** = `"whisper-1"` \| `string` & `NonNullable`\<`unknown`\>

`whisper-1` is OpenAI's own model; any other string is passed through as-is,
which is what a self-hosted OpenAI-compatible transcription server (vLLM,
LiteLLM, a diarization sidecar) expects — e.g. `"qwen3-asr"`.
