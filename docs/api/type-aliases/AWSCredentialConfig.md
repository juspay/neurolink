[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AWSCredentialConfig

# Type Alias: AWSCredentialConfig

> **AWSCredentialConfig** = `object`

Defined in: [types/providers.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L154)

AWS Credential Configuration for Bedrock provider

## Properties

### region?

> `optional` **region?**: `string`

Defined in: [types/providers.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L155)

---

### profile?

> `optional` **profile?**: `string`

Defined in: [types/providers.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L156)

---

### roleArn?

> `optional` **roleArn?**: `string`

Defined in: [types/providers.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L157)

---

### roleSessionName?

> `optional` **roleSessionName?**: `string`

Defined in: [types/providers.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L158)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L159)

---

### ~~maxRetries?~~

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L161)

#### Deprecated

Prefer maxAttempts to match AWS SDK v3 config

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/providers.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L163)

Number of attempts as per AWS SDK v3 ("retry-mode")

---

### enableDebugLogging?

> `optional` **enableDebugLogging?**: `boolean`

Defined in: [types/providers.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L164)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L166)

Optional service endpoint override (e.g., VPC/Gov endpoints)
