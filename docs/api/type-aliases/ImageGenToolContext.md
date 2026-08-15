[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolContext

# Type Alias: ImageGenToolContext

> **ImageGenToolContext** = `object`

Defined in: [types/imageGen.ts:285](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/imageGen.ts#L285)

Context for tool execution (optional)

## Properties

### referenceImages?

> `optional` **referenceImages?**: (`Buffer` \| `string`)[]

Defined in: [types/imageGen.ts:289](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/imageGen.ts#L289)

Reference images to use for generation

---

### referencePdfs?

> `optional` **referencePdfs?**: `Buffer`[]

Defined in: [types/imageGen.ts:294](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/imageGen.ts#L294)

Reference PDFs to use for generation

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/imageGen.ts:299](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/imageGen.ts#L299)

User ID for tracking/logging

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/imageGen.ts:304](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/imageGen.ts#L304)

Session ID for tracking/logging

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/imageGen.ts:309](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/imageGen.ts#L309)

Additional metadata
