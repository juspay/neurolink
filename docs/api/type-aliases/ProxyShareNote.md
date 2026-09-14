[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4104)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4105)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4106)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4107)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4108)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4109)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4110)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4111)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4112)
