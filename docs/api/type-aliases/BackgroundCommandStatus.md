[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandStatus

# Type Alias: BackgroundCommandStatus

> **BackgroundCommandStatus** = `object`

Defined in: [types/backgroundCommand.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L120)

Everything known about one command right now.

`stdout` / `stderr` appear once the command has settled and its streams have
been banked; `tailPreview` is available throughout and is always bounded.
The preview is for orientation — the banked artifacts are the evidence.

## Properties

### taskId

> **taskId**: `string`

Defined in: [types/backgroundCommand.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L121)

---

### label

> **label**: `string`

Defined in: [types/backgroundCommand.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L123)

Short human label, e.g. "git log" — which command this is.

---

### state

> **state**: [`BackgroundCommandState`](BackgroundCommandState.md)

Defined in: [types/backgroundCommand.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L124)

---

### exitCode?

> `optional` **exitCode?**: `number`

Defined in: [types/backgroundCommand.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L126)

Process exit code, once it exited on its own.

---

### signal?

> `optional` **signal?**: `string`

Defined in: [types/backgroundCommand.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L128)

Signal that ended the process, when one did.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/backgroundCommand.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L129)

---

### stdoutBytes

> **stdoutBytes**: `number`

Defined in: [types/backgroundCommand.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L131)

Bytes written to each stream's log file so far.

---

### stderrBytes

> **stderrBytes**: `number`

Defined in: [types/backgroundCommand.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L132)

---

### stdout?

> `optional` **stdout?**: [`BankedArtifactRef`](BankedArtifactRef.md)

Defined in: [types/backgroundCommand.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L134)

The FULL stdout, banked (N3). Present once settled.

---

### stderr?

> `optional` **stderr?**: [`BankedArtifactRef`](BankedArtifactRef.md)

Defined in: [types/backgroundCommand.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L136)

The FULL stderr, banked (N3). Present once settled.

---

### tailPreview

> **tailPreview**: `string`

Defined in: [types/backgroundCommand.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L138)

Tail of the output so far, ≤ 2000 chars. Never a substitute for the files.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/backgroundCommand.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L140)

Why the command could not run, or how it was cut short.
