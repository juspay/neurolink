[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerBoundedBodyRead

# Type Alias: ServerBoundedBodyRead

> **ServerBoundedBodyRead** = `object`

A body read as far as its limit: the bytes, and whether the connection is to
be closed after the answer. That is the case when a compressed body was
complete but the request kept sending past the cap on raw bytes, which are
then left unread.

## Properties

### bytes

> **bytes**: `Buffer`

---

### closeConnection

> **closeConnection**: `boolean`
