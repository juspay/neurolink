[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SystemPromptInjectorOptions

# Type Alias: SystemPromptInjectorOptions

> **SystemPromptInjectorOptions** = `object`

Defined in: [types/proxy.ts:403](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L403)

Options for the SystemPromptInjector cloaking plugin.

## Properties

### ide?

> `optional` **ide?**: `string`

Defined in: [types/proxy.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L405)

IDE name to inject (default: "vscode").

---

### ideVersion?

> `optional` **ideVersion?**: `string`

Defined in: [types/proxy.ts:407](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L407)

IDE version (default: "1.96.2").

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/proxy.ts:409](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L409)

Platform string (default: "darwin").

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/proxy.ts:411](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L411)

Working directory to inject (default: "/home/user/project").

---

### preamble?

> `optional` **preamble?**: `string`

Defined in: [types/proxy.ts:413](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L413)

Extra preamble to prepend.
