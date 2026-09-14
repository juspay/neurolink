[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4556)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4557)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4559)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4560)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4563)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4565)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4566)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4567)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4569)

Set once the streak crossed the tolerance and the grant was paused.
