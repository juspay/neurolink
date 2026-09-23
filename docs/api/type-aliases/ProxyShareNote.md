[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4370)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4371)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4372)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4373)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4374)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4375)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4376)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4377)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4378)
