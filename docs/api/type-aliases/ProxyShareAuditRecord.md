[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4445)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4446)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4448)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4449)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4452)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4454)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4455)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4456)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4458)

Set once the streak crossed the tolerance and the grant was paused.
