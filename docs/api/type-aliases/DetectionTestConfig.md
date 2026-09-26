[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

---

### testName

> **testName**: `string`

---

### endpointName

> **endpointName**: `string`

---

### semaphore

> **semaphore**: `object`

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

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

---

### rateLimitState

> **rateLimitState**: `object`

#### count

> **count**: `number`
