[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisioningBundle

# Type Alias: ProxyShareProvisioningBundle

> **ProxyShareProvisioningBundle** = `object`

Defined in: [types/proxy.ts:4228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4228)

The handover artifact a lender gives a complete-share borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4229)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4230)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4231)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4232)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4233)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4234)

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4235)

---

### tokens

> **tokens**: `object`

Defined in: [types/proxy.ts:4236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4236)

#### accessToken

> **accessToken**: `string`

#### refreshToken?

> `optional` **refreshToken?**: `string`

#### expiresAt?

> `optional` **expiresAt?**: `number`
