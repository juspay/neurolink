[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolContext

# Type Alias: ImageGenToolContext

> **ImageGenToolContext** = `object`

Defined in: [types/imageGen.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L285)

Context for tool execution (optional)

## Properties

### referenceImages?

> `optional` **referenceImages?**: (`Buffer` \| `string`)[]

Defined in: [types/imageGen.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L289)

Reference images to use for generation

---

### referencePdfs?

> `optional` **referencePdfs?**: `Buffer`[]

Defined in: [types/imageGen.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L294)

Reference PDFs to use for generation

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/imageGen.ts:299](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L299)

User ID for tracking/logging

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/imageGen.ts:304](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L304)

Session ID for tracking/logging

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/imageGen.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L309)

Additional metadata
