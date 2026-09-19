[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2319](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2319)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2320)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2321)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2322)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2323)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2324)

#### acquire()

> **acquire**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### release()

> **release**(): `void`

##### Returns

`void`

---

### incrementRateLimit

> **incrementRateLimit**: () => `void`

Defined in: [types/providers.ts:2328](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2328)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2329)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2330)

#### count

> **count**: `number`
