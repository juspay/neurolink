[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTVadEngine

# Type Alias: STTVadEngine

> **STTVadEngine** = `"auto"` \| `"silero"` \| `"energy"`

The detector that decides where utterances start and end in a chunked
stream. `"silero"` is the Silero VAD model (a 2.3 MB ONNX file shipped
with the package, run through the optional `onnxruntime-node`); `"energy"`
is the RMS gate with a noise-floor estimate; `"auto"` (the default) is
Silero when its model and runtime load and the energy gate otherwise.
`NEUROLINK_STT_VAD` sets the default.
