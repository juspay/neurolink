[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SystemPromptInjectorOptions

# Type Alias: SystemPromptInjectorOptions

> **SystemPromptInjectorOptions** = `object`

Defined in: [types/proxy.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L433)

Options for the SystemPromptInjector cloaking plugin.

## Properties

### ide?

> `optional` **ide?**: `string`

Defined in: [types/proxy.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L435)

IDE name to inject (default: "vscode").

---

### ideVersion?

> `optional` **ideVersion?**: `string`

Defined in: [types/proxy.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L437)

IDE version (default: "1.96.2").

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/proxy.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L439)

Platform string (default: "darwin").

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/proxy.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L441)

Working directory to inject (default: "/home/user/project").

---

### preamble?

> `optional` **preamble?**: `string`

Defined in: [types/proxy.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L443)

Extra preamble to prepend.
