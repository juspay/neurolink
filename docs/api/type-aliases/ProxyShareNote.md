[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNote

# Type Alias: ProxyShareNote

> **ProxyShareNote** = `object`

A bearer credit one node issued, which any node holding it may redeem against
the issuer.

Signed by the issuer with a node-level secret, because the grant that
eventually redeems it need not have existed when it was issued.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### noteId

> **noteId**: `string`

---

### issuer

> **issuer**: `string`

---

### coins

> **coins**: `number`

---

### issuedAt

> **issuedAt**: `number`

---

### notAfter

> **notAfter**: `number`

---

### memo?

> `optional` **memo?**: `string`

---

### signature

> **signature**: `string`
