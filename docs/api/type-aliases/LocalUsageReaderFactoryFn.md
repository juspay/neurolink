[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReaderFactoryFn

# Type Alias: LocalUsageReaderFactoryFn

> **LocalUsageReaderFactoryFn** = () => `Promise`\<[`LocalUsageReader`](LocalUsageReader.md)\>

Async factory stored in the registry — a reader needs no credentials, only
the filesystem, so this takes no arguments.

## Returns

`Promise`\<[`LocalUsageReader`](LocalUsageReader.md)\>
