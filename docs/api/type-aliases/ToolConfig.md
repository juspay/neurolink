[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolConfig

# Type Alias: ToolConfig

> **ToolConfig** = `object`

Defined in: [types/config.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L384)

Instance-level tool configuration (`new NeuroLink({ tools: {...} })`).

The four primary keys (`enabled`, `include`, `exclude`, `discovery`) form
the complete modern surface; per-call options (`toolFilter`,
`excludeTools`, `enabledToolNames`, `disableTools`) keep working and are
merged with this config by `resolveToolPolicy()`.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L390)

Master switch. `false` disables all tools for every call from this
instance (equivalent to passing `disableTools: true` on each call).
Default: true.

---

### include?

> `optional` **include?**: `string`[]

Defined in: [types/config.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L397)

Allowlist of tool names. Supports `*` globs (e.g. `"github*"`).
Undefined = all tools; an EMPTY array means no tools (fail-closed).
Per-call `toolFilter` is bounded by this list (a per-call filter can
narrow it further but never widen past it).

---

### exclude?

> `optional` **exclude?**: `string`[]

Defined in: [types/config.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L399)

Denylist of tool names (supports `*` globs). Applied after `include`.

---

### discovery?

> `optional` **discovery?**: `boolean`

Defined in: [types/config.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L411)

Defer external MCP tool schemas behind a `search_tools` meta-tool: the
model sees a compact name+summary catalog instead of full schemas and
loads a tool on demand by searching for it. Built-in tools, per-call
tools, per-call whitelists (`toolFilter`/`enabledToolNames`), forced
`toolChoice` tools, and already-discovered tools are always sent in
full. Note: the instance-level `include` list deliberately does NOT
force tools hot — it scopes the catalog, and discovery defers within
that scope (a scoped-but-large catalog is exactly where deferral pays).
Default: false.

---

### disableBuiltinTools?

> `optional` **disableBuiltinTools?**: `boolean`

Defined in: [types/config.ts:413](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L413)

Whether built-in tools should be disabled (equivalent to excluding all direct tools)

---

### allowCustomTools?

> `optional` **allowCustomTools?**: `boolean`

Defined in: [types/config.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L415)

Whether custom tools are allowed

---

### ~~maxToolsPerProvider?~~

> `optional` **maxToolsPerProvider?**: `number`

Defined in: [types/config.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L419)

#### Deprecated

Never enforced; retained for compile compatibility only.

---

### enableMCPTools?

> `optional` **enableMCPTools?**: `boolean`

Defined in: [types/config.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L421)

Whether MCP tools should be enabled

---

### enableBashTool?

> `optional` **enableBashTool?**: `boolean`

Defined in: [types/config.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L423)

Whether the bash command execution tool should be enabled (opt-in, defaults to false)

---

### outputTruncationMaxBytes?

> `optional` **outputTruncationMaxBytes?**: `number`

Defined in: [types/config.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L433)

Byte ceiling for the safety-net truncation `ToolsManager` applies to
every direct/custom/external-MCP tool result before it reaches the AI
SDK accumulator (BZ-666). Independent of `mcp.outputLimits`, which only
governs external MCP results earlier in the pipeline via its own
externalize-to-artifact-store strategy. Default: 51200 (50 KB) —
unchanged from the previous hard-coded ceiling, so existing consumers
see no behavior change unless they set this explicitly.
