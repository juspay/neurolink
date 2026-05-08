[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReportGenerator

# Class: ReportGenerator

Defined in: [evaluation/reporting/reportGenerator.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/reportGenerator.ts#L27)

Report generator class

## Constructors

### Constructor

> **new ReportGenerator**(`config?`): `ReportGenerator`

Defined in: [evaluation/reporting/reportGenerator.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/reportGenerator.ts#L30)

#### Parameters

##### config?

`Partial`\<[`ReportConfig`](../type-aliases/ReportConfig.md)\>

#### Returns

`ReportGenerator`

## Methods

### generate()

> **generate**(`data`): [`GeneratedReport`](../type-aliases/GeneratedReport.md)

Defined in: [evaluation/reporting/reportGenerator.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/reportGenerator.ts#L37)

Generate a report

#### Parameters

##### data

[`ReportData`](../type-aliases/ReportData.md)

#### Returns

[`GeneratedReport`](../type-aliases/GeneratedReport.md)

---

### configure()

> **configure**(`config`): `void`

Defined in: [evaluation/reporting/reportGenerator.ts:419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/reportGenerator.ts#L419)

Update configuration

#### Parameters

##### config

`Partial`\<[`ReportConfig`](../type-aliases/ReportConfig.md)\>

#### Returns

`void`
