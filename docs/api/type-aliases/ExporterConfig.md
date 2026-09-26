[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterConfig

# Type Alias: ExporterConfig

> **ExporterConfig** = `object`

Base configuration for all exporters

## Properties

### enabled

> **enabled**: `boolean`

Whether the exporter is enabled

---

### maxBufferSize?

> `optional` **maxBufferSize?**: `number`

Maximum spans to buffer before auto-flush

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Flush interval in milliseconds

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds

---

### retries?

> `optional` **retries?**: `number`

Number of retry attempts

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Custom headers for HTTP requests

---

### environment?

> `optional` **environment?**: `string`

Environment name (dev, staging, prod)

---

### version?

> `optional` **version?**: `string`

Service/application version
