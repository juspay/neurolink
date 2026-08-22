[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationOptions

# Type Alias: ToolValidationOptions

> **ToolValidationOptions** = `object`

Defined in: [types/tools.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L558)

Tool validation options

## Properties

### customValidator?

> `optional` **customValidator?**: (`toolName`, `params`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [types/tools.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L559)

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

Defined in: [types/tools.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L563)

---

### allowUnknownProperties?

> `optional` **allowUnknownProperties?**: `boolean`

Defined in: [types/tools.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L564)
