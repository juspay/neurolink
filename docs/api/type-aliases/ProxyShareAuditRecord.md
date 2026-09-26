[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4917)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4918)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4920)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4921)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4924)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4926)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4927)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4928)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4930)

Set once the streak crossed the tolerance and the grant was paused.
