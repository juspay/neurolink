[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Reports

# Variable: Reports

> `const` **Reports**: `object`

Defined in: [evaluation/reporting/reportGenerator.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/reportGenerator.ts#L436)

Quick report generation functions

## Type Declaration

### text

> **text**: (`data`) => [`GeneratedReport`](../type-aliases/GeneratedReport.md)

Generate text report

#### Parameters

##### data

[`ReportData`](../type-aliases/ReportData.md)

#### Returns

[`GeneratedReport`](../type-aliases/GeneratedReport.md)

### json

> **json**: (`data`) => [`GeneratedReport`](../type-aliases/GeneratedReport.md)

Generate JSON report

#### Parameters

##### data

[`ReportData`](../type-aliases/ReportData.md)

#### Returns

[`GeneratedReport`](../type-aliases/GeneratedReport.md)

### markdown

> **markdown**: (`data`) => [`GeneratedReport`](../type-aliases/GeneratedReport.md)

Generate Markdown report

#### Parameters

##### data

[`ReportData`](../type-aliases/ReportData.md)

#### Returns

[`GeneratedReport`](../type-aliases/GeneratedReport.md)

### html

> **html**: (`data`) => [`GeneratedReport`](../type-aliases/GeneratedReport.md)

Generate HTML report

#### Parameters

##### data

[`ReportData`](../type-aliases/ReportData.md)

#### Returns

[`GeneratedReport`](../type-aliases/GeneratedReport.md)
