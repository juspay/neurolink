[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GitToolResult

# Type Alias: GitToolResult

> **GitToolResult** = `object`

Defined in: [types/gitTools.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L53)

What every git tool returns.

`preview` is a bounded head slice for the conversation; `output` points at
the COMPLETE stdout on disk. They are not alternatives — a `git diff` whose
preview looks empty may still have banked megabytes.

## Properties

### command

> **command**: `string`[]

Defined in: [types/gitTools.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L55)

The exact argv that ran, so the result is reproducible by hand.

---

### ok

> **ok**: `boolean`

Defined in: [types/gitTools.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L57)

True when git exited 0.

---

### exitCode?

> `optional` **exitCode?**: `number`

Defined in: [types/gitTools.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L58)

---

### state

> **state**: [`BackgroundCommandState`](BackgroundCommandState.md)

Defined in: [types/gitTools.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L59)

---

### preview

> **preview**: `string`

Defined in: [types/gitTools.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L61)

Bounded head slice of stdout.

---

### output

> **output**: [`BankedArtifactRef`](BankedArtifactRef.md)

Defined in: [types/gitTools.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L63)

The FULL stdout, banked (N3).

---

### readBackHint

> **readBackHint**: `string`

Defined in: [types/gitTools.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L65)

Literal `retrieve_context` call that reads the rest of stdout.

---

### stderrPreview?

> `optional` **stderrPreview?**: `string`

Defined in: [types/gitTools.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L67)

Bounded head slice of stderr, present only when git wrote something there.
