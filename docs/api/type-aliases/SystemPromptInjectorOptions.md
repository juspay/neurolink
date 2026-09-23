[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SystemPromptInjectorOptions

# Type Alias: SystemPromptInjectorOptions

> **SystemPromptInjectorOptions** = `object`

Defined in: [types/proxy.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L453)

Options for the SystemPromptInjector cloaking plugin.

## Properties

### ide?

> `optional` **ide?**: `string`

Defined in: [types/proxy.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L455)

IDE name to inject (default: "vscode").

---

### ideVersion?

> `optional` **ideVersion?**: `string`

Defined in: [types/proxy.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L457)

IDE version (default: "1.96.2").

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/proxy.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L459)

Platform string (default: "darwin").

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/proxy.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L461)

Working directory to inject (default: "/home/user/project").

---

### preamble?

> `optional` **preamble?**: `string`

Defined in: [types/proxy.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L463)

Extra preamble to prepend.
