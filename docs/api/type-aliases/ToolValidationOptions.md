[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationOptions

# Type Alias: ToolValidationOptions

> **ToolValidationOptions** = `object`

Defined in: [types/tools.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L592)

Tool validation options

## Properties

### customValidator?

> `optional` **customValidator?**: (`toolName`, `params`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [types/tools.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L593)

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

Defined in: [types/tools.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L597)

---

### allowUnknownProperties?

> `optional` **allowUnknownProperties?**: `boolean`

Defined in: [types/tools.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L598)
