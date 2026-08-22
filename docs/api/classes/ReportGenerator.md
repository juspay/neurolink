[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReportGenerator

# Class: ReportGenerator

Defined in: [evaluation/reporting/reportGenerator.ts:27](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/reporting/reportGenerator.ts#L27)

Report generator class

## Constructors

### Constructor

> **new ReportGenerator**(`config?`): `ReportGenerator`

Defined in: [evaluation/reporting/reportGenerator.ts:30](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/reporting/reportGenerator.ts#L30)

#### Parameters

##### config?

`Partial`\<[`ReportConfig`](../type-aliases/ReportConfig.md)\>

#### Returns

`ReportGenerator`

## Methods

### generate()

> **generate**(`data`): [`GeneratedReport`](../type-aliases/GeneratedReport.md)

Defined in: [evaluation/reporting/reportGenerator.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/reporting/reportGenerator.ts#L37)

Generate a report

#### Parameters

##### data

[`ReportData`](../type-aliases/ReportData.md)

#### Returns

[`GeneratedReport`](../type-aliases/GeneratedReport.md)

---

### configure()

> **configure**(`config`): `void`

Defined in: [evaluation/reporting/reportGenerator.ts:419](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/reporting/reportGenerator.ts#L419)

Update configuration

#### Parameters

##### config

`Partial`\<[`ReportConfig`](../type-aliases/ReportConfig.md)\>

#### Returns

`void`
