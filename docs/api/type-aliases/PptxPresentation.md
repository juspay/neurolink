[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PptxPresentation

# Type Alias: PptxPresentation

> **PptxPresentation** = `object`

PptxGenJS Presentation interface
Defines the methods we use from a pptxgenjs presentation instance

## Properties

### addSlide

> **addSlide**: () => [`PptxSlide`](PptxSlide.md)

Add a new slide to the presentation

#### Returns

[`PptxSlide`](PptxSlide.md)

---

### defineLayout

> **defineLayout**: (`layout`) => `void`

Define a custom layout

#### Parameters

##### layout

###### name

`string`

###### width

`number`

###### height

`number`

#### Returns

`void`

---

### layout

> **layout**: `string`

Current layout name

---

### title?

> `optional` **title?**: `string`

Presentation title metadata

---

### subject?

> `optional` **subject?**: `string`

Presentation subject metadata

---

### author?

> `optional` **author?**: `string`

Presentation author metadata

---

### company?

> `optional` **company?**: `string`

Presentation company metadata

---

### writeFile

> **writeFile**: (`options`) => `Promise`\<`string`\>

Write presentation to file

#### Parameters

##### options

###### fileName

`string`

#### Returns

`Promise`\<`string`\>

---

### write

> **write**: (`options`) => `Promise`\<`unknown`\>

Write presentation to buffer/stream

#### Parameters

##### options

###### outputType

`string`

#### Returns

`Promise`\<`unknown`\>
