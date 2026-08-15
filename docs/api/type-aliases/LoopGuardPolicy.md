[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPolicy

# Type Alias: LoopGuardPolicy

> **LoopGuardPolicy** = `object`

Defined in: [types/context.ts:937](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L937)

Tuning for planLoopGuardReclaim.

## Properties

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:938](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L938)

---

### fixedOverheadTokens

> **fixedOverheadTokens**: `number`

Defined in: [types/context.ts:940](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L940)

System prompt + tool definitions — rides outside the message array.

---

### thresholdRatio?

> `optional` **thresholdRatio?**: `number`

Defined in: [types/context.ts:942](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L942)

Fraction of the window at which the guard fires.

---

### lowWaterRatio?

> `optional` **lowWaterRatio?**: `number`

Defined in: [types/context.ts:944](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L944)

Fraction of the window the guard reclaims down to once it fires.

---

### protectedTailCount?

> `optional` **protectedTailCount?**: `number`

Defined in: [types/context.ts:946](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L946)

Newest entries the guard must never modify.

---

### calibration?

> `optional` **calibration?**: `number`

Defined in: [types/context.ts:948](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L948)

Observed/estimated token ratio, used to tighten both marks.
