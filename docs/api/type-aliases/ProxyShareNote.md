[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4463)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4464)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4465)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4466)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4467)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4468)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4469)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4470)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4471)
