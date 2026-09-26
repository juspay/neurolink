[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4525)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4526)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4527)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4528)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4529)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4530)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4531)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4532)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4533)
