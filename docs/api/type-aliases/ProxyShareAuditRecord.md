[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4842)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4843)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4845)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4846)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4849)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4851)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4852)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4853)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4855)

Set once the streak crossed the tolerance and the grant was paused.
