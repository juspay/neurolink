[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReader

# Type Alias: LocalUsageReader

> **LocalUsageReader** = `object`

Defined in: [types/localUsage.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L120)

The contract every reader implements — one per CLI.

## Properties

### descriptor

> **descriptor**: [`LocalUsageReaderDescriptor`](LocalUsageReaderDescriptor.md)

Defined in: [types/localUsage.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L121)

---

### detect

> **detect**: () => `Promise`\<`boolean`\>

Defined in: [types/localUsage.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L127)

Whether this CLI's local store appears to exist on this machine at all —
the same "do not report on something never installed" discipline the proxy
client configurators use before writing a config.

#### Returns

`Promise`\<`boolean`\>

---

### scan

> **scan**: (`options?`) => `Promise`\<[`LocalUsageScanResult`](LocalUsageScanResult.md)\>

Defined in: [types/localUsage.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L128)

#### Parameters

##### options?

[`LocalUsageScanOptions`](LocalUsageScanOptions.md)

#### Returns

`Promise`\<[`LocalUsageScanResult`](LocalUsageScanResult.md)\>
