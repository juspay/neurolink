[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandPageRequest

# Type Alias: BackgroundCommandPageRequest

> **BackgroundCommandPageRequest** = `object`

Character window for a paginated output read.

## Properties

### stream

> **stream**: [`BackgroundCommandStreamName`](BackgroundCommandStreamName.md)

---

### offset?

> `optional` **offset?**: `number`

Character offset to start at. Default 0.

---

### limit?

> `optional` **limit?**: `number`

Maximum characters to return. Default 50_000, hard cap 200_000.
