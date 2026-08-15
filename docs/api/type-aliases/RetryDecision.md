[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryDecision

# Type Alias: RetryDecision

> **RetryDecision** = `object`

Defined in: [types/observability.ts:402](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L402)

Result of a retry decision

## Properties

### shouldRetry

> **shouldRetry**: `boolean`

Defined in: [types/observability.ts:404](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L404)

Whether to retry

---

### delayMs

> **delayMs**: `number`

Defined in: [types/observability.ts:406](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L406)

Delay before retry in milliseconds

---

### reason

> **reason**: `string`

Defined in: [types/observability.ts:408](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L408)

Reason for the decision
