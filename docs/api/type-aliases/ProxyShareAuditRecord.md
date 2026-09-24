[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4967)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4968)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4970)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4971)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4974)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4976)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4977)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4978)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4980)

Set once the streak crossed the tolerance and the grant was paused.
