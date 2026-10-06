[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / registerDefaultSTTHandlers

# Function: registerDefaultSTTHandlers()

> **registerDefaultSTTHandlers**(): `void`

Register every shipped STT handler whose backing credentials are present in
the ENVIRONMENT, plus the built-in local engine (Whistle), which is always
registered because it is what a transcription with nothing configured falls
back to, plus the env-declared named endpoints (`NEUROLINK_STT_ENDPOINTS`).
Safe to call multiple times; a name that is already registered is left
alone. Deliberately takes no credentials: the registry is process-wide, so
a handler built from one caller's keys or base URL would be served to every
later caller — per-call and per-instance credentials are resolved at call
time by `STTProcessor.resolveHandler` / `createSTTHandler` instead.

## Returns

`void`
