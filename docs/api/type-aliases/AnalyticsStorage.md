[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyticsStorage

# Type Alias: AnalyticsStorage

> **AnalyticsStorage** = `object`

Pluggable storage backend for analytics telemetry records.

## Methods

### saveRecord()

> **saveRecord**(`record`): `Promise`\<`void`\>

Save a telemetry record

#### Parameters

##### record

[`TelemetryRecord`](TelemetryRecord.md)

#### Returns

`Promise`\<`void`\>

---

### getRecords()

> **getRecords**(): `Promise`\<[`TelemetryRecord`](TelemetryRecord.md)[]\>

Retrieve all records

#### Returns

`Promise`\<[`TelemetryRecord`](TelemetryRecord.md)[]\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Clear storage

#### Returns

`Promise`\<`void`\>
