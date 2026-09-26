[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolPolicyResolutionInput

# Type Alias: ToolPolicyResolutionInput

> **ToolPolicyResolutionInput** = `object`

Inputs to `resolveToolPolicy()`. Kept as a named type so the mapping is
unit-testable as a pure function.

## Properties

### options

> **options**: `object`

Per-call options (the legacy per-call filtering surface).

#### disableTools?

> `optional` **disableTools?**: `boolean`

#### toolFilter?

> `optional` **toolFilter?**: `string`[]

#### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

#### excludeTools?

> `optional` **excludeTools?**: `string`[]

---

### instanceConfig?

> `optional` **instanceConfig?**: [`ToolConfig`](ToolConfig.md)

Instance-level `tools` config passed to the NeuroLink constructor.

---

### builtinToolNames?

> `optional` **builtinToolNames?**: `string`[]

Names of the built-in (direct) tools of the calling provider — used to
honor `tools.disableBuiltinTools` without this module importing the
direct-tools registry.
