[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTVadOptions

# Type Alias: STTVadOptions

> **STTVadOptions** = `object`

Speech-detector choice and tuning (`streaming.vad`).

## Properties

### engine?

> `optional` **engine?**: [`STTVadEngine`](STTVadEngine.md)

---

### onset?

> `optional` **onset?**: `number`

Speech probability at or above which an utterance may open. Default 0.6.

---

### sustain?

> `optional` **sustain?**: `number`

Probability at or above which an open utterance counts a block as speech. Default 0.35.

---

### startMs?

> `optional` **startMs?**: `number`

Consecutive milliseconds at or above `onset` before an utterance opens,
so a click or a cough does not. Default 120; the pre-roll keeps the
confirmation audio, so nothing is clipped.

---

### modelDir?

> `optional` **modelDir?**: `string`

Directory holding `silero_vad.onnx`. Default: `NEUROLINK_VAD_DIR`, `NEUROLINK_MODEL_DIR/silero-vad`, the package's own copy, then `~/.neurolink/models/silero-vad`.

---

### autoDownload?

> `optional` **autoDownload?**: `boolean`

Whether a missing model file may be downloaded (`NEUROLINK_VAD_AUTO_DOWNLOAD`). Default true.
