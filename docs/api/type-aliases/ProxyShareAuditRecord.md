[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4822)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4823)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4825)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4826)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4829)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4831)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4832)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4833)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4835)

Set once the streak crossed the tolerance and the grant was paused.
