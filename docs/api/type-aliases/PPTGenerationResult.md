[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PPTGenerationResult

# Type Alias: PPTGenerationResult

> **PPTGenerationResult** = `object`

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

Path to the generated PPTX file

---

### totalSlides

> **totalSlides**: `number`

Total number of slides in the presentation

---

### format

> **format**: [`OutputFormatOption`](OutputFormatOption.md)

Output format (always "pptx" currently)

---

### provider

> **provider**: `string`

Provider used for PPT generation

---

### model

> **model**: `string`

Model used for PPT generation

---

### metadata?

> `optional` **metadata?**: `object`

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
