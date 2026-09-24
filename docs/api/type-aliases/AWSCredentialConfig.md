[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AWSCredentialConfig

# Type Alias: AWSCredentialConfig

> **AWSCredentialConfig** = `object`

Defined in: [types/providers.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L158)

AWS Credential Configuration for Bedrock provider

## Properties

### region?

> `optional` **region?**: `string`

Defined in: [types/providers.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L159)

---

### profile?

> `optional` **profile?**: `string`

Defined in: [types/providers.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L160)

---

### roleArn?

> `optional` **roleArn?**: `string`

Defined in: [types/providers.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L161)

---

### roleSessionName?

> `optional` **roleSessionName?**: `string`

Defined in: [types/providers.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L162)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L163)

---

### ~~maxRetries?~~

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L165)

#### Deprecated

Prefer maxAttempts to match AWS SDK v3 config

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/providers.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L167)

Number of attempts as per AWS SDK v3 ("retry-mode")

---

### enableDebugLogging?

> `optional` **enableDebugLogging?**: `boolean`

Defined in: [types/providers.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L168)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L170)

Optional service endpoint override (e.g., VPC/Gov endpoints)
