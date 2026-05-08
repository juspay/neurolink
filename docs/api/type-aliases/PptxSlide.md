[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PptxSlide

# Type Alias: PptxSlide

> **PptxSlide** = `object`

Defined in: [types/ppt.ts:1155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1155)

PptxGenJS Slide interface
Defines the methods we use from a pptxgenjs slide

## Properties

### background?

> `optional` **background?**: [`PptxBackgroundOptions`](PptxBackgroundOptions.md)

Defined in: [types/ppt.ts:1157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1157)

Slide background

---

### addText

> **addText**: (`text`, `options?`) => `PptxSlide`

Defined in: [types/ppt.ts:1159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1159)

Add text to the slide - supports plain text, text props array, or rich text props array

#### Parameters

##### text

`string` \| [`PptxTextProps`](PptxTextProps.md)[] \| [`PptxRichTextProps`](PptxRichTextProps.md)[]

##### options?

[`PptxTextOptions`](PptxTextOptions.md)

#### Returns

`PptxSlide`

---

### addImage

> **addImage**: (`options`) => `PptxSlide`

Defined in: [types/ppt.ts:1164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1164)

Add an image to the slide

#### Parameters

##### options

[`PptxImageOptions`](PptxImageOptions.md)

#### Returns

`PptxSlide`

---

### addShape

> **addShape**: (`shapeName`, `options?`) => `PptxSlide`

Defined in: [types/ppt.ts:1166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1166)

Add a shape to the slide

#### Parameters

##### shapeName

`string`

##### options?

[`PptxShapeOptions`](PptxShapeOptions.md)

#### Returns

`PptxSlide`

---

### addChart

> **addChart**: (`chartType`, `data`, `options?`) => `PptxSlide`

Defined in: [types/ppt.ts:1168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1168)

Add a chart to the slide

#### Parameters

##### chartType

[`PptxChartName`](PptxChartName.md)

##### data

[`PptxChartData`](PptxChartData.md)[]

##### options?

[`PptxChartOptions`](PptxChartOptions.md)

#### Returns

`PptxSlide`

---

### addTable

> **addTable**: (`rows`, `options?`) => `PptxSlide`

Defined in: [types/ppt.ts:1174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1174)

Add a table to the slide

#### Parameters

##### rows

[`PptxTableRow`](PptxTableRow.md)[]

##### options?

[`PptxTableOptions`](PptxTableOptions.md)

#### Returns

`PptxSlide`

---

### addNotes

> **addNotes**: (`notes`) => `PptxSlide`

Defined in: [types/ppt.ts:1176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1176)

Add speaker notes to the slide

#### Parameters

##### notes

`string`

#### Returns

`PptxSlide`
