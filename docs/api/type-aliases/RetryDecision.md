[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryDecision

# Type Alias: RetryDecision

> **RetryDecision** = `object`

Defined in: [types/observability.ts:402](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L402)

Result of a retry decision

## Properties

### shouldRetry

> **shouldRetry**: `boolean`

Defined in: [types/observability.ts:404](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L404)

Whether to retry

---

### delayMs

> **delayMs**: `number`

Defined in: [types/observability.ts:406](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L406)

Delay before retry in milliseconds

---

### reason

> **reason**: `string`

Defined in: [types/observability.ts:408](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L408)

Reason for the decision
