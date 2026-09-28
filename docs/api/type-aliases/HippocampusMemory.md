[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusMemory

# Type Alias: HippocampusMemory

> **HippocampusMemory** = [`HippocampusConfig`](HippocampusConfig.md) & [`MemoryWriteHooks`](MemoryWriteHooks.md) & `object`

Consumer-facing memory config. The `enabled` flag toggles activation; the
`HippocampusConfig` part is passed to the Hippocampus constructor when the
optional package is installed. The remaining fields are NeuroLink-side and
never reach Hippocampus.

## Type Declaration

### enabled?

> `optional` **enabled?**: `boolean`

### client?

> `optional` **client?**: [`HippocampusLike`](HippocampusLike.md) \| [`HippocampusClientFactory`](HippocampusClientFactory.md)

Host-managed Hippocampus client (or any object with the same
`add/get/delete/close` surface). When set, NeuroLink skips loading and
constructing `@juspay/hippocampus` and uses this instance directly.
`add()` and `get()` are what core calls and must both be functions;
a client missing either disables memory with an `error` log.

As a factory it receives the `HippocampusConfig` NeuroLink assembled —
including the credentialed condenser under `neurolink.instance` — so a
host can construct its own client (a subclass, a different version, a
test double) from exactly what `new Hippocampus(config)` would get.

### strictPrompt?

> `optional` **strictPrompt?**: `boolean`

When true, a condensation prompt template (instance `prompt` or
`HC_CONDENSATION_PROMPT`) missing `{{OLD_MEMORY}}` or `{{NEW_CONTENT}}`
makes the constructor throw instead of the default disable-and-log
(at `error`). An empty or whitespace-only template counts as unset.
