[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SystemPromptInjectorOptions

# Type Alias: SystemPromptInjectorOptions

> **SystemPromptInjectorOptions** = `object`

Defined in: [types/proxy.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L421)

Options for the SystemPromptInjector cloaking plugin.

## Properties

### ide?

> `optional` **ide?**: `string`

Defined in: [types/proxy.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L423)

IDE name to inject (default: "vscode").

---

### ideVersion?

> `optional` **ideVersion?**: `string`

Defined in: [types/proxy.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L425)

IDE version (default: "1.96.2").

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/proxy.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L427)

Platform string (default: "darwin").

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/proxy.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L429)

Working directory to inject (default: "/home/user/project").

---

### preamble?

> `optional` **preamble?**: `string`

Defined in: [types/proxy.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L431)

Extra preamble to prepend.
