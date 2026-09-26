[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResolvedToolPolicy

# Type Alias: ResolvedToolPolicy

> **ResolvedToolPolicy** = `object`

The resolved, merged tool policy for one request. Produced by
`resolveToolPolicy()` (src/lib/tools/toolPolicy.ts) and consumed by
`applyToolGate()` (src/lib/tools/toolGate.ts).

## Properties

### enabled

> **enabled**: `boolean`

false = no tools at all for this request (drops caller-supplied tools too).

---

### include?

> `optional` **include?**: `string`[]

Allowlist of tool-name patterns (exact names or `*` globs).
`undefined` = all tools pass. An empty array means "no tools" — it can
only come from the new `tools.include` config surface; legacy
`toolFilter: []` is normalized to `undefined` (fail-open, preserving
historical behavior) before it reaches here.

---

### includeBound?

> `optional` **includeBound?**: `string`[]

Secondary allowlist clause ANDed with `include` — set when both a
legacy per-call allowlist and the instance `tools.include` are present.
Kept as a separate clause because two glob pattern lists cannot be
losslessly pre-intersected into a single pattern array (a name must
match BOTH lists to pass).

---

### exclude

> **exclude**: `string`[]

Denylist of tool-name patterns (exact names or `*` globs), applied after include.

---

### discovery

> **discovery**: `boolean`

Defer external MCP tool schemas behind the search_tools meta-tool.

---

### sources

> **sources**: `string`[]

Which option/config sources contributed to this policy (telemetry/debugging).
