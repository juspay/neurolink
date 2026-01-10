[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseConfig

# Type Alias: LangfuseConfig

> **LangfuseConfig** = `object`

Defined in: [types/observability.ts:10](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L10)

Langfuse observability configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/observability.ts:12](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L12)

Whether Langfuse is enabled

---

### publicKey

> **publicKey**: `string`

Defined in: [types/observability.ts:14](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L14)

Langfuse public key

---

### secretKey

> **secretKey**: `string`

Defined in: [types/observability.ts:21](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L21)

Langfuse secret key

#### Sensitive

WARNING: This is a sensitive credential. Handle securely.
Do NOT log, expose, or share this key. Follow best practices for secret management.

---

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [types/observability.ts:23](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L23)

Langfuse base URL (default: https://cloud.langfuse.com)

---

### environment?

> `optional` **environment**: `string`

Defined in: [types/observability.ts:25](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L25)

Environment name (e.g., dev, staging, prod)

---

### release?

> `optional` **release**: `string`

Defined in: [types/observability.ts:27](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L27)

Release/version identifier

---

### userId?

> `optional` **userId**: `string`

Defined in: [types/observability.ts:29](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L29)

Optional default user id to attach to spans

---

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/observability.ts:31](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L31)

Optional default session id to attach to spans
