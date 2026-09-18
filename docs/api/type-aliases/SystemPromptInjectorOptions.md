[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SystemPromptInjectorOptions

# Type Alias: SystemPromptInjectorOptions

> **SystemPromptInjectorOptions** = `object`

Defined in: [types/proxy.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L422)

Options for the SystemPromptInjector cloaking plugin.

## Properties

### ide?

> `optional` **ide?**: `string`

Defined in: [types/proxy.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L424)

IDE name to inject (default: "vscode").

---

### ideVersion?

> `optional` **ideVersion?**: `string`

Defined in: [types/proxy.ts:426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L426)

IDE version (default: "1.96.2").

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/proxy.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L428)

Platform string (default: "darwin").

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/proxy.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L430)

Working directory to inject (default: "/home/user/project").

---

### preamble?

> `optional` **preamble?**: `string`

Defined in: [types/proxy.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L432)

Extra preamble to prepend.
