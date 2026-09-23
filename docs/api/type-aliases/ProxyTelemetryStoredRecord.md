[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryStoredRecord

# Type Alias: ProxyTelemetryStoredRecord

> **ProxyTelemetryStoredRecord** = `Partial`\<[`RequestLogEntry`](RequestLogEntry.md)\> & `object`

Defined in: [types/proxy.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L985)

Small stored metadata used by the doctor; bodies are queried separately.

## Type Declaration

### recordedAtMicroseconds?

> `optional` **recordedAtMicroseconds?**: `number`

### id?

> `optional` **id?**: `string`

### at?

> `optional` **at?**: `string`

### captureId?

> `optional` **captureId?**: `string`

### bodySha256?

> `optional` **bodySha256?**: `string`

### redactedBodyBytes?

> `optional` **redactedBodyBytes?**: `number`

### bodyDelivery?

> `optional` **bodyDelivery?**: `object`

#### bodyDelivery.status?

> `optional` **status?**: `string`

### captureError?

> `optional` **captureError?**: `string`

### captureAdmission?

> `optional` **captureAdmission?**: [`ProxyBodyCaptureAdmission`](ProxyBodyCaptureAdmission.md)

### bodyTruncated?

> `optional` **bodyTruncated?**: `boolean`

### phase?

> `optional` **phase?**: `string`

### event?

> `optional` **event?**: `string`

### telemetryStatus?

> `optional` **telemetryStatus?**: `string`

### outcomeSource?

> `optional` **outcomeSource?**: `string`

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

### redactionLossy?

> `optional` **redactionLossy?**: `boolean`
