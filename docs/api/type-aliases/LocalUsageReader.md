[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReader

# Type Alias: LocalUsageReader

> **LocalUsageReader** = `object`

The contract every reader implements — one per CLI.

## Properties

### descriptor

> **descriptor**: [`LocalUsageReaderDescriptor`](LocalUsageReaderDescriptor.md)

---

### detect

> **detect**: () => `Promise`\<`boolean`\>

Whether this CLI's local store appears to exist on this machine at all —
the same "do not report on something never installed" discipline the proxy
client configurators use before writing a config.

#### Returns

`Promise`\<`boolean`\>

---

### scan

> **scan**: (`options?`) => `Promise`\<[`LocalUsageScanResult`](LocalUsageScanResult.md)\>

#### Parameters

##### options?

[`LocalUsageScanOptions`](LocalUsageScanOptions.md)

#### Returns

`Promise`\<[`LocalUsageScanResult`](LocalUsageScanResult.md)\>
