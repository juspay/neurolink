[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PPTGenerationResult

# Type Alias: PPTGenerationResult

> **PPTGenerationResult** = `object`

Defined in: [types/ppt.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L102)

Result type for generated presentation content

Returned in `GenerateResult.ppt` when presentation generation is successful.
Contains the file path and metadata about the generated presentation.

## Example

```typescript
const result = await neurolink.generate({
  input: { text: "Introducing Our New Product" },
  provider: "vertex",
  output: { mode: "ppt", ppt: { pages: 10, theme: "modern" } },
});

if (result.ppt) {
  console.log(`Presentation saved: ${result.ppt.filePath}`);
  console.log(`Total slides: ${result.ppt.totalSlides}`);
  console.log(`Theme: ${result.ppt.metadata?.theme}`);
}
```

## Properties

### filePath

> **filePath**: `string`

Defined in: [types/ppt.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L104)

Path to the generated PPTX file

---

### totalSlides

> **totalSlides**: `number`

Defined in: [types/ppt.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L106)

Total number of slides in the presentation

---

### format

> **format**: [`OutputFormatOption`](OutputFormatOption.md)

Defined in: [types/ppt.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L108)

Output format (always "pptx" currently)

---

### provider

> **provider**: `string`

Defined in: [types/ppt.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L110)

Provider used for PPT generation

---

### model

> **model**: `string`

Defined in: [types/ppt.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L112)

Model used for PPT generation

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/ppt.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L114)

Presentation metadata

#### theme?

> `optional` **theme?**: `string`

Theme/style used (may be AI-selected if "AI will decide" was used)

#### audience?

> `optional` **audience?**: `string`

Target audience (may be AI-selected if "AI will decide" was used)

#### tone?

> `optional` **tone?**: `string`

Presentation tone (may be AI-selected if "AI will decide" was used)

#### imageModel?

> `optional` **imageModel?**: `string`

Model used for image generation

#### fileSize?

> `optional` **fileSize?**: `number`

File size in bytes
