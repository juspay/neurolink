[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:3765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3765)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3766)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:3767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3767)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:3768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3768)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3769)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:3770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3770)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:3771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3771)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:3772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3772)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3773)
