[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4143)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4144)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4145)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4146)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4147)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4148)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4149)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4150)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4151)
