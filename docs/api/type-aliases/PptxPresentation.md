[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PptxPresentation

# Type Alias: PptxPresentation

> **PptxPresentation** = `object`

Defined in: [types/ppt.ts:1183](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1183)

PptxGenJS Presentation interface
Defines the methods we use from a pptxgenjs presentation instance

## Properties

### addSlide

> **addSlide**: () => [`PptxSlide`](PptxSlide.md)

Defined in: [types/ppt.ts:1185](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1185)

Add a new slide to the presentation

#### Returns

[`PptxSlide`](PptxSlide.md)

---

### defineLayout

> **defineLayout**: (`layout`) => `void`

Defined in: [types/ppt.ts:1187](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1187)

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

Defined in: [types/ppt.ts:1193](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1193)

Current layout name

---

### title?

> `optional` **title?**: `string`

Defined in: [types/ppt.ts:1195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1195)

Presentation title metadata

---

### subject?

> `optional` **subject?**: `string`

Defined in: [types/ppt.ts:1197](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1197)

Presentation subject metadata

---

### author?

> `optional` **author?**: `string`

Defined in: [types/ppt.ts:1199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1199)

Presentation author metadata

---

### company?

> `optional` **company?**: `string`

Defined in: [types/ppt.ts:1201](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1201)

Presentation company metadata

---

### writeFile

> **writeFile**: (`options`) => `Promise`\<`string`\>

Defined in: [types/ppt.ts:1203](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1203)

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

Defined in: [types/ppt.ts:1205](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L1205)

Write presentation to buffer/stream

#### Parameters

##### options

###### outputType

`string`

#### Returns

`Promise`\<`unknown`\>
