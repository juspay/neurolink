[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisioningBundle

# Type Alias: ProxyShareProvisioningBundle

> **ProxyShareProvisioningBundle** = `object`

The handover artifact a lender gives a complete-share borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### grantId

> **grantId**: `string`

---

### lenderName

> **lenderName**: `string`

---

### lenderUrl

> **lenderUrl**: `string`

---

### accountLabel

> **accountLabel**: `string`

---

### leaseSecret

> **leaseSecret**: `string`

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

---

### tokens

> **tokens**: `object`

#### accessToken

> **accessToken**: `string`

#### refreshToken?

> `optional` **refreshToken?**: `string`

#### expiresAt?

> `optional` **expiresAt?**: `number`
