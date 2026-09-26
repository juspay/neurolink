[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationOptions

# Type Alias: ToolValidationOptions

> **ToolValidationOptions** = `object`

Tool validation options

## Properties

### customValidator?

> `optional` **customValidator?**: (`toolName`, `params`) => `boolean` \| `Promise`\<`boolean`\>

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

---

### allowUnknownProperties?

> `optional` **allowUnknownProperties?**: `boolean`
