[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResolvedToolPolicy

# Type Alias: ResolvedToolPolicy

> **ResolvedToolPolicy** = `object`

Defined in: [types/toolResolution.ts:19](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L19)

The resolved, merged tool policy for one request. Produced by
`resolveToolPolicy()` (src/lib/tools/toolPolicy.ts) and consumed by
`applyToolGate()` (src/lib/tools/toolGate.ts).

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/toolResolution.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L21)

false = no tools at all for this request (drops caller-supplied tools too).

---

### include?

> `optional` **include?**: `string`[]

Defined in: [types/toolResolution.ts:29](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L29)

Allowlist of tool-name patterns (exact names or `*` globs).
`undefined` = all tools pass. An empty array means "no tools" — it can
only come from the new `tools.include` config surface; legacy
`toolFilter: []` is normalized to `undefined` (fail-open, preserving
historical behavior) before it reaches here.

---

### includeBound?

> `optional` **includeBound?**: `string`[]

Defined in: [types/toolResolution.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L37)

Secondary allowlist clause ANDed with `include` — set when both a
legacy per-call allowlist and the instance `tools.include` are present.
Kept as a separate clause because two glob pattern lists cannot be
losslessly pre-intersected into a single pattern array (a name must
match BOTH lists to pass).

---

### exclude

> **exclude**: `string`[]

Defined in: [types/toolResolution.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L39)

Denylist of tool-name patterns (exact names or `*` globs), applied after include.

---

### discovery

> **discovery**: `boolean`

Defined in: [types/toolResolution.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L41)

Defer external MCP tool schemas behind the search_tools meta-tool.

---

### sources

> **sources**: `string`[]

Defined in: [types/toolResolution.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolResolution.ts#L43)

Which option/config sources contributed to this policy (telemetry/debugging).
