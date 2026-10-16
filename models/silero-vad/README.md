# Silero VAD (bundled)

The speech-detector model the `transcribe` streaming path uses to find
utterances, so that the default works without any download:

| File              | Source                                                             | SHA-256 (prefix)   |
| ----------------- | ------------------------------------------------------------------ | ------------------ |
| `silero_vad.onnx` | `snakers4/silero-vad` @ `bfdc0193023f121ea5b3cc7b176dbed570a68a59` | `1a153a22f4509e29` |

The upstream repository is published under the MIT License. The full hash is
pinned in `src/lib/voice/vad/assets.ts`, which verifies the file before use,
here or in any other directory. The model runs through the optional
dependency `onnxruntime-node`; without it the stream falls back to the energy
gate.

Resolution order: `streaming.vad.modelDir` / `NEUROLINK_VAD_DIR`
→ `NEUROLINK_MODEL_DIR/silero-vad` → this directory
→ `~/.neurolink/models/silero-vad` (where a missing file is downloaded, unless
auto-download is off).
