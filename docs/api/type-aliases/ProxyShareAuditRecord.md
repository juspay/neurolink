[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4845)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4846)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4848)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4849)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4852)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4854)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4855)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4856)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4858)

Set once the streak crossed the tolerance and the grant was paused.
