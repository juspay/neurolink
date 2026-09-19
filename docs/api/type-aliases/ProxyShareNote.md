[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4273)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4274)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4275)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4276)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4277)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4278)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4279)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4280)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4281)
