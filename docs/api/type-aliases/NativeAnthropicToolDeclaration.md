[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeAnthropicToolDeclaration

# Type Alias: NativeAnthropicToolDeclaration

> **NativeAnthropicToolDeclaration** = `object`

Defined in: [types/nativeTools.ts:10](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/nativeTools.ts#L10)

A single tool declaration in Anthropic's native `input_schema` wire format.

## Properties

### name

> **name**: `string`

Defined in: [types/nativeTools.ts:11](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/nativeTools.ts#L11)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/nativeTools.ts:12](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/nativeTools.ts#L12)

---

### input_schema

> **input_schema**: `Record`\<`string`, `unknown`\>

Defined in: [types/nativeTools.ts:13](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/nativeTools.ts#L13)

---

### cache_control?

> `optional` **cache_control?**: `object`

Defined in: [types/nativeTools.ts:14](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/nativeTools.ts#L14)

#### type

> **type**: `"ephemeral"`
