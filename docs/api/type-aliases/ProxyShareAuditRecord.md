[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4570)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4571)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4573)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4574)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4577)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4579)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4580)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4581)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4583)

Set once the streak crossed the tolerance and the grant was paused.
