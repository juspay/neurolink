[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryDecision

# Type Alias: RetryDecision

> **RetryDecision** = `object`

Defined in: [types/observability.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L402)

Result of a retry decision

## Properties

### shouldRetry

> **shouldRetry**: `boolean`

Defined in: [types/observability.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L404)

Whether to retry

---

### delayMs

> **delayMs**: `number`

Defined in: [types/observability.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L406)

Delay before retry in milliseconds

---

### reason

> **reason**: `string`

Defined in: [types/observability.ts:408](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L408)

Reason for the decision
