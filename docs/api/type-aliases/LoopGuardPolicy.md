[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPolicy

# Type Alias: LoopGuardPolicy

> **LoopGuardPolicy** = `object`

Tuning for planLoopGuardReclaim.

## Properties

### availableInputTokens

> **availableInputTokens**: `number`

---

### fixedOverheadTokens

> **fixedOverheadTokens**: `number`

System prompt + tool definitions — rides outside the message array.

---

### thresholdRatio?

> `optional` **thresholdRatio?**: `number`

Fraction of the window at which the guard fires.

---

### lowWaterRatio?

> `optional` **lowWaterRatio?**: `number`

Fraction of the window the guard reclaims down to once it fires.

---

### protectedTailCount?

> `optional` **protectedTailCount?**: `number`

Newest entries the guard must never modify.

---

### calibration?

> `optional` **calibration?**: `number`

Observed/estimated token ratio, used to tighten both marks.
