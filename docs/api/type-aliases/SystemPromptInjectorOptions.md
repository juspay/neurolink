[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SystemPromptInjectorOptions

# Type Alias: SystemPromptInjectorOptions

> **SystemPromptInjectorOptions** = `object`

Defined in: [types/proxy.ts:415](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L415)

Options for the SystemPromptInjector cloaking plugin.

## Properties

### ide?

> `optional` **ide?**: `string`

Defined in: [types/proxy.ts:417](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L417)

IDE name to inject (default: "vscode").

---

### ideVersion?

> `optional` **ideVersion?**: `string`

Defined in: [types/proxy.ts:419](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L419)

IDE version (default: "1.96.2").

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/proxy.ts:421](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L421)

Platform string (default: "darwin").

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/proxy.ts:423](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L423)

Working directory to inject (default: "/home/user/project").

---

### preamble?

> `optional` **preamble?**: `string`

Defined in: [types/proxy.ts:425](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L425)

Extra preamble to prepend.
