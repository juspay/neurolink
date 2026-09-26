[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextCompactRequest

# Type Alias: ContextCompactRequest

> **ContextCompactRequest** = `object`

Per-call context handed to `ContextCompactor.compact`.

## Properties

### currentRequest?

> `optional` **currentRequest?**: `string`

The request being prepared. Without it the relevance stage cannot run —
"is this message still needed?" is meaningless without knowing what for.
