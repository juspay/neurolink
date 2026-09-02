[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:3774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3774)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3775)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:3776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3776)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:3777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3777)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3778)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:3779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3779)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:3780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3780)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:3781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3781)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3782)
