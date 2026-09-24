[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisioningBundle

# Type Alias: ProxyShareProvisioningBundle

> **ProxyShareProvisioningBundle** = `object`

Defined in: [types/proxy.ts:5000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5000)

The handover artifact a lender gives a complete-share borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:5001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5001)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:5002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5002)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:5003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5003)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:5004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5004)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:5005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5005)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:5006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5006)

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:5007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5007)

---

### tokens

> **tokens**: `object`

Defined in: [types/proxy.ts:5008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5008)

#### accessToken

> **accessToken**: `string`

#### refreshToken?

> `optional` **refreshToken?**: `string`

#### expiresAt?

> `optional` **expiresAt?**: `number`
