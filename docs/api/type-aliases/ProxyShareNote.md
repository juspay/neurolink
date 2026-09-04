[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:3780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3780)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3781)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:3782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3782)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:3783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3783)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3784)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:3785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3785)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:3786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3786)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:3787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3787)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3788)
