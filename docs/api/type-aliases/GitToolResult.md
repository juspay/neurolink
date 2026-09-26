[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GitToolResult

# Type Alias: GitToolResult

> **GitToolResult** = `object`

What every git tool returns.

`preview` is a bounded head slice for the conversation; `output` points at
the COMPLETE stdout on disk. They are not alternatives — a `git diff` whose
preview looks empty may still have banked megabytes.

## Properties

### command

> **command**: `string`[]

The exact argv that ran, so the result is reproducible by hand.

---

### ok

> **ok**: `boolean`

True when git exited 0.

---

### exitCode?

> `optional` **exitCode?**: `number`

---

### state

> **state**: [`BackgroundCommandState`](BackgroundCommandState.md)

---

### preview

> **preview**: `string`

Bounded head slice of stdout.

---

### output

> **output**: [`BankedArtifactRef`](BankedArtifactRef.md)

The FULL stdout, banked (N3).

---

### readBackHint

> **readBackHint**: `string`

Literal `retrieve_context` call that reads the rest of stdout.

---

### stderrPreview?

> `optional` **stderrPreview?**: `string`

Bounded head slice of stderr, present only when git wrote something there.
