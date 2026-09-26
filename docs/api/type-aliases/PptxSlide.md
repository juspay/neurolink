[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PptxSlide

# Type Alias: PptxSlide

> **PptxSlide** = `object`

PptxGenJS Slide interface
Defines the methods we use from a pptxgenjs slide

## Properties

### background?

> `optional` **background?**: [`PptxBackgroundOptions`](PptxBackgroundOptions.md)

Slide background

---

### addText

> **addText**: (`text`, `options?`) => `PptxSlide`

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

Add an image to the slide

#### Parameters

##### options

[`PptxImageOptions`](PptxImageOptions.md)

#### Returns

`PptxSlide`

---

### addShape

> **addShape**: (`shapeName`, `options?`) => `PptxSlide`

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

Add speaker notes to the slide

#### Parameters

##### notes

`string`

#### Returns

`PptxSlide`
