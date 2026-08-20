[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:3673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3673)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3674)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:3675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3675)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:3676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3676)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3677)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:3678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3678)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:3679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3679)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:3680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3680)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3681)
