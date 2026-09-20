[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextCompactRequest

# Type Alias: ContextCompactRequest

> **ContextCompactRequest** = `object`

Defined in: [types/context.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1095)

Per-call context handed to `ContextCompactor.compact`.

## Properties

### currentRequest?

> `optional` **currentRequest?**: `string`

Defined in: [types/context.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1100)

The request being prepared. Without it the relevance stage cannot run —
"is this message still needed?" is meaningless without knowing what for.
