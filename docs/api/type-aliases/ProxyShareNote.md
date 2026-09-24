[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

Defined in: [types/proxy.ts:4515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4515)

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4516)

---

### noteId

> **noteId**: `string`

Defined in: [types/proxy.ts:4517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4517)

---

### issuer

> **issuer**: `string`

Defined in: [types/proxy.ts:4518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4518)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4519)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4520)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4521)

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/proxy.ts:4522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4522)

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4523)
