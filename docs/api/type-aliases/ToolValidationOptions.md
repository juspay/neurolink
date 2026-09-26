[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationOptions

# Type Alias: ToolValidationOptions

> **ToolValidationOptions** = `object`

Defined in: [types/tools.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L605)

Tool validation options

## Properties

### customValidator?

> `optional` **customValidator?**: (`toolName`, `params`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [types/tools.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L606)

#### Parameters

##### toolName

`string`

##### params

[`ToolArgs`](ToolArgs.md)

#### Returns

`boolean` \| `Promise`\<`boolean`\>

---

### validateSchema?

> `optional` **validateSchema?**: `boolean`

Defined in: [types/tools.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L610)

---

### allowUnknownProperties?

> `optional` **allowUnknownProperties?**: `boolean`

Defined in: [types/tools.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L611)
