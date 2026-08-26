[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationOptions

# Type Alias: ToolValidationOptions

> **ToolValidationOptions** = `object`

Defined in: [types/tools.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L569)

Tool validation options

## Properties

### customValidator?

> `optional` **customValidator?**: (`toolName`, `params`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [types/tools.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L570)

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

Defined in: [types/tools.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L574)

---

### allowUnknownProperties?

> `optional` **allowUnknownProperties?**: `boolean`

Defined in: [types/tools.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L575)
