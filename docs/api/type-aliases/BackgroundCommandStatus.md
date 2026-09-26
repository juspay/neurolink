[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandStatus

# Type Alias: BackgroundCommandStatus

> **BackgroundCommandStatus** = `object`

Everything known about one command right now.

`stdout` / `stderr` appear once the command has settled and its streams have
been banked; `tailPreview` is available throughout and is always bounded.
The preview is for orientation — the banked artifacts are the evidence.

## Properties

### taskId

> **taskId**: `string`

---

### label

> **label**: `string`

Short human label, e.g. "git log" — which command this is.

---

### state

> **state**: [`BackgroundCommandState`](BackgroundCommandState.md)

---

### exitCode?

> `optional` **exitCode?**: `number`

Process exit code, once it exited on its own.

---

### signal?

> `optional` **signal?**: `string`

Signal that ended the process, when one did.

---

### durationMs

> **durationMs**: `number`

---

### stdoutBytes

> **stdoutBytes**: `number`

Bytes written to each stream's log file so far.

---

### stderrBytes

> **stderrBytes**: `number`

---

### stdout?

> `optional` **stdout?**: [`BankedArtifactRef`](BankedArtifactRef.md)

The FULL stdout, banked (N3). Present once settled.

---

### stderr?

> `optional` **stderr?**: [`BankedArtifactRef`](BankedArtifactRef.md)

The FULL stderr, banked (N3). Present once settled.

---

### tailPreview

> **tailPreview**: `string`

Tail of the output so far, ≤ 2000 chars. Never a substitute for the files.

---

### error?

> `optional` **error?**: `string`

Why the command could not run, or how it was cut short.
