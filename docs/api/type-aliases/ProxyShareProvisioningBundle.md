[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisioningBundle

# Type Alias: ProxyShareProvisioningBundle

> **ProxyShareProvisioningBundle** = `object`

Defined in: [types/proxy.ts:4265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4265)

The handover artifact a lender gives a complete-share borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4266)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4267)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4268)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4269)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4270)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4271)

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4272)

---

### tokens

> **tokens**: `object`

Defined in: [types/proxy.ts:4273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4273)

#### accessToken

> **accessToken**: `string`

#### refreshToken?

> `optional` **refreshToken?**: `string`

#### expiresAt?

> `optional` **expiresAt?**: `number`
