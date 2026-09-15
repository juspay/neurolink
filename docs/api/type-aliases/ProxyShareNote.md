[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4118)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4119)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4120)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4121)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4122)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4123)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4124)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4125)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4126)
