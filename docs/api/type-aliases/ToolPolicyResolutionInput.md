[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolPolicyResolutionInput

# Type Alias: ToolPolicyResolutionInput

> **ToolPolicyResolutionInput** = `object`

Defined in: [types/toolResolution.ts:50](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L50)

Inputs to `resolveToolPolicy()`. Kept as a named type so the mapping is
unit-testable as a pure function.

## Properties

### options

> **options**: `object`

Defined in: [types/toolResolution.ts:52](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L52)

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

Defined in: [types/toolResolution.ts:59](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L59)

Instance-level `tools` config passed to the NeuroLink constructor.

---

### builtinToolNames?

> `optional` **builtinToolNames?**: `string`[]

Defined in: [types/toolResolution.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L65)

Names of the built-in (direct) tools of the calling provider — used to
honor `tools.disableBuiltinTools` without this module importing the
direct-tools registry.
