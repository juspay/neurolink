[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyticsStorage

# Type Alias: AnalyticsStorage

> **AnalyticsStorage** = `object`

Defined in: [types/analytics.ts:138](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L138)

Pluggable storage backend for analytics telemetry records.

## Methods

### saveRecord()

> **saveRecord**(`record`): `Promise`\<`void`\>

Defined in: [types/analytics.ts:140](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L140)

Save a telemetry record

#### Parameters

##### record

[`TelemetryRecord`](TelemetryRecord.md)

#### Returns

`Promise`\<`void`\>

---

### getRecords()

> **getRecords**(): `Promise`\<[`TelemetryRecord`](TelemetryRecord.md)[]\>

Defined in: [types/analytics.ts:142](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L142)

Retrieve all records

#### Returns

`Promise`\<[`TelemetryRecord`](TelemetryRecord.md)[]\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [types/analytics.ts:144](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L144)

Clear storage

#### Returns

`Promise`\<`void`\>
