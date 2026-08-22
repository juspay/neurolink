[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryAnalyticsStorageOptions

# Type Alias: InMemoryAnalyticsStorageOptions

> **InMemoryAnalyticsStorageOptions** = `object`

Defined in: [types/analytics.ts:150](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L150)

Options for the bounded in-memory analytics storage backend.

## Properties

### maxRecords?

> `optional` **maxRecords?**: `number`

Defined in: [types/analytics.ts:152](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L152)

Maximum records to retain. Oldest records are evicted when exceeded.
