[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Reports

# Variable: Reports

> `const` **Reports**: `object`

Defined in: [evaluation/reporting/reportGenerator.ts:436](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/reporting/reportGenerator.ts#L436)

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
