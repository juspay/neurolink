[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UniversalProviderOptions

# Type Alias: UniversalProviderOptions

> **UniversalProviderOptions** = `object`

Defined in: [types/universalProviderOptions.ts:12](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L12)

Base configuration interface for all AI providers
Uses Parameter Object Pattern for flexible, extensible configuration

## Properties

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/universalProviderOptions.ts:14](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L14)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/universalProviderOptions.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L15)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/universalProviderOptions.ts:16](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L16)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/universalProviderOptions.ts:17](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L17)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/universalProviderOptions.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L20)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/universalProviderOptions.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L21)

---

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/universalProviderOptions.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L22)

---

### context?

> `optional` **context?**: [`BaseContext`](BaseContext.md)

Defined in: [types/universalProviderOptions.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L25)

---

### contextConfig?

> `optional` **contextConfig?**: `Partial`\<[`ContextConfig`](ContextConfig.md)\>

Defined in: [types/universalProviderOptions.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L26)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/universalProviderOptions.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L27)

---

### extensionOptions?

> `optional` **extensionOptions?**: `Record`\<`string`, `unknown`\>

Defined in: [types/universalProviderOptions.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L30)
