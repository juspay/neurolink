[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AWSCredentialConfig

# Type Alias: AWSCredentialConfig

> **AWSCredentialConfig** = `object`

AWS Credential Configuration for Bedrock provider

## Properties

### region?

> `optional` **region?**: `string`

---

### profile?

> `optional` **profile?**: `string`

---

### roleArn?

> `optional` **roleArn?**: `string`

---

### roleSessionName?

> `optional` **roleSessionName?**: `string`

---

### timeout?

> `optional` **timeout?**: `number`

---

### ~~maxRetries?~~

> `optional` **maxRetries?**: `number`

#### Deprecated

Prefer maxAttempts to match AWS SDK v3 config

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Number of attempts as per AWS SDK v3 ("retry-mode")

---

### enableDebugLogging?

> `optional` **enableDebugLogging?**: `boolean`

---

### endpoint?

> `optional` **endpoint?**: `string`

Optional service endpoint override (e.g., VPC/Gov endpoints)
