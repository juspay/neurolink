[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4195)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4196)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4198)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4199)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4202)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4204)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4205)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4206)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4208)

Set once the streak crossed the tolerance and the grant was paused.
