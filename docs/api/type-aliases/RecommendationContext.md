[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecommendationContext

# Type Alias: RecommendationContext

> **RecommendationContext** = `object`

Defined in: [types/model.ts:221](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L221)

Model recommendation context

## Properties

### useCase?

> `optional` **useCase?**: keyof [`UseCaseSuitability`](UseCaseSuitability.md)

Defined in: [types/model.ts:222](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L222)

---

### maxCost?

> `optional` **maxCost?**: `number`

Defined in: [types/model.ts:223](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L223)

---

### minQuality?

> `optional` **minQuality?**: `"low"` \| `"medium"` \| `"high"`

Defined in: [types/model.ts:224](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L224)

---

### requireCapabilities?

> `optional` **requireCapabilities?**: keyof [`ModelCapabilities`](ModelCapabilities.md)[]

Defined in: [types/model.ts:225](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L225)

---

### excludeProviders?

> `optional` **excludeProviders?**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/model.ts:226](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L226)

---

### contextSize?

> `optional` **contextSize?**: `number`

Defined in: [types/model.ts:227](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L227)

---

### preferLocal?

> `optional` **preferLocal?**: `boolean`

Defined in: [types/model.ts:228](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L228)
