[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryCallOptions

# Type Alias: MemoryCallOptions

> **MemoryCallOptions** = [`MemoryWriteHooks`](MemoryWriteHooks.md) & `object`

Per-call `memory` block shared by `GenerateOptions` and `StreamOptions`.

Overrides the instance-level memory behaviour for one call. All flags
default to `true` when the instance memory SDK is enabled; when it is
disabled this block has no effect.

## Type Declaration

### enabled?

> `optional` **enabled?**: `boolean`

Master toggle for this call. When false, both read and write are skipped. Defaults to true.

### read?

> `optional` **read?**: `boolean`

Whether to read condensed memory and prepend to prompt. Defaults to true.

### write?

> `optional` **write?**: `boolean`

Whether to write (add/condense) the conversation into memory after completion. Defaults to true.

### additionalUsers?

> `optional` **additionalUsers?**: [`AdditionalMemoryUser`](AdditionalMemoryUser.md)[]

Additional users whose memory should be retrieved/stored alongside the primary user.
Each entry can override the condensation prompt and maxWords for that user.
Primary user is still determined by context.userId.

### prompt?

> `optional` **prompt?**: `string`

Condensation prompt for the primary owner on this call. Precedence:
per-call > instance `conversationMemory.memory.prompt` > Hippocampus
default. Must contain `{{OLD_MEMORY}}` and `{{NEW_CONTENT}}`; a template
missing either is logged and the instance prompt is used instead. An
empty or whitespace-only string counts as unset.

### maxWords?

> `optional` **maxWords?**: `number`

Max words for the primary owner's condensed memory on this call.
