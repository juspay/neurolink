[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTCorrectionOutput

# Type Alias: STTCorrectionOutput

> **STTCorrectionOutput** = `object`

## Properties

### text

> **text**: `string`

---

### decisions

> **decisions**: [`STTDecisionRecord`](STTDecisionRecord.md)[]

---

### steps

> **steps**: `string`[]

---

### timings

> **timings**: `Pick`\<[`TranscribeTimings`](TranscribeTimings.md), `"decideMs"` \| `"rewriteMs"` \| `"correctionMs"`\>
