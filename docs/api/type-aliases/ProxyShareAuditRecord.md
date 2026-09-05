[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4246)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4247)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4249)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4250)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4253)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4255)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4256)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4257)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4259)

Set once the streak crossed the tolerance and the grant was paused.
