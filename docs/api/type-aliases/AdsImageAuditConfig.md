[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdsImageAuditConfig

# Type Alias: AdsImageAuditConfig

> **AdsImageAuditConfig** = `object`

## Properties

### generation

> **generation**: `Pick`\<[`GenerateOptions`](GenerateOptions.md), `"provider"` \| `"model"` \| `"region"`\>

---

### market?

> `optional` **market?**: `string`

ISO country code. Defaults to IN for this initial pilot.

---

### decisionModels?

> `optional` **decisionModels?**: `object`

Explicit deployed model IDs, for example xor-1.2 on its released serving bundle.

#### xor?

> `optional` **xor?**: `string`

#### typesafe?

> `optional` **typesafe?**: `string`

---

### adSource?

> `optional` **adSource?**: [`AdsImageAuditAdSource`](AdsImageAuditAdSource.md)

---

### imageLoader?

> `optional` **imageLoader?**: (`url`, `signal?`) => `Promise`\<`Buffer`\>

Trusted custom image transport. Returned bytes are still decoded and bounded by the SDK.

#### Parameters

##### url

`string`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`Buffer`\>

---

### storeReader?

> `optional` **storeReader?**: (`input`, `index`, `signal?`) => `Promise`\<[`AdsImageAuditStore`](AdsImageAuditStore.md)\>

Trusted custom storefront researcher; supplied context takes precedence.

#### Parameters

##### input

[`AdsImageAuditStoreInput`](AdsImageAuditStoreInput.md)

##### index

`number`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<[`AdsImageAuditStore`](AdsImageAuditStore.md)\>

---

### onProgress?

> `optional` **onProgress?**: (`event`) => `void`

#### Parameters

##### event

[`AdsImageAuditProgress`](AdsImageAuditProgress.md)

#### Returns

`void`

---

### signal?

> `optional` **signal?**: `AbortSignal`
