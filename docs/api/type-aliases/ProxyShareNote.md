[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:3743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3743)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:3745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3745)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:3748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3748)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:3749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3749)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:3750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3750)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3751)
