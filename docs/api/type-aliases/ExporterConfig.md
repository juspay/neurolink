[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterConfig

# Type Alias: ExporterConfig

> **ExporterConfig** = `object`

Defined in: [types/exporter.ts:9](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L9)

Base configuration for all exporters

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/exporter.ts:11](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L11)

Whether the exporter is enabled

---

### maxBufferSize?

> `optional` **maxBufferSize?**: `number`

Defined in: [types/exporter.ts:13](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L13)

Maximum spans to buffer before auto-flush

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/exporter.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L15)

Flush interval in milliseconds

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/exporter.ts:17](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L17)

Request timeout in milliseconds

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/exporter.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L19)

Number of retry attempts

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/exporter.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L21)

Custom headers for HTTP requests

---

### environment?

> `optional` **environment?**: `string`

Defined in: [types/exporter.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L23)

Environment name (dev, staging, prod)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/exporter.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/exporter.ts#L25)

Service/application version
