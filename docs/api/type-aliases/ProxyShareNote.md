[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:3794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3794)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3795)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:3796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3796)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:3797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3797)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3798)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:3799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3799)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:3800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3800)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:3801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3801)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3802)
