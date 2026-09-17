[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4574)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4575)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4577)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4578)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4581)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4583)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4584)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4585)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4587)

Set once the streak crossed the tolerance and the grant was paused.
