[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4393)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4394)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4395)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4396)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4397)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4398)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4399)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4400)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4401)
