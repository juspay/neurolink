[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AWSCredentialConfig

# Type Alias: AWSCredentialConfig

> **AWSCredentialConfig** = `object`

Defined in: [types/providers.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L159)

AWS Credential Configuration for Bedrock provider

## Properties

### region?

> `optional` **region?**: `string`

Defined in: [types/providers.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L160)

---

### profile?

> `optional` **profile?**: `string`

Defined in: [types/providers.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L161)

---

### roleArn?

> `optional` **roleArn?**: `string`

Defined in: [types/providers.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L162)

---

### roleSessionName?

> `optional` **roleSessionName?**: `string`

Defined in: [types/providers.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L163)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L164)

---

### ~~maxRetries?~~

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L166)

#### Deprecated

Prefer maxAttempts to match AWS SDK v3 config

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/providers.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L168)

Number of attempts as per AWS SDK v3 ("retry-mode")

---

### enableDebugLogging?

> `optional` **enableDebugLogging?**: `boolean`

Defined in: [types/providers.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L169)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L171)

Optional service endpoint override (e.g., VPC/Gov endpoints)
