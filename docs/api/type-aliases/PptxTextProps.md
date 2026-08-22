[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PptxTextProps

# Type Alias: PptxTextProps

> **PptxTextProps** = `object`

Defined in: [types/ppt.ts:919](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L919)

Text properties for addText method
Represents individual text items with formatting options

## Properties

### text

> **text**: `string`

Defined in: [types/ppt.ts:920](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L920)

---

### options?

> `optional` **options?**: `object`

Defined in: [types/ppt.ts:921](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ppt.ts#L921)

#### bullet?

> `optional` **bullet?**: `boolean` \| \{ `type?`: `"bullet"` \| `"number"`; `characterCode?`: `string`; `indent?`: `number`; `numberType?`: `"alphaLcParenBoth"` \| `"alphaLcParenR"` \| `"alphaLcPeriod"` \| `"alphaUcParenBoth"` \| `"alphaUcParenR"` \| `"alphaUcPeriod"` \| `"arabicParenBoth"` \| `"arabicParenR"` \| `"arabicPeriod"` \| `"romanLcParenBoth"` \| `"romanLcParenR"` \| `"romanLcPeriod"` \| `"romanUcParenBoth"` \| `"romanUcParenR"` \| `"romanUcPeriod"`; `numberStartAt?`: `number`; `color?`: `string`; `rtlMode?`: `boolean`; `style?`: `string`; \}

#### fontSize?

> `optional` **fontSize?**: `number`

#### fontFace?

> `optional` **fontFace?**: `string`

#### color?

> `optional` **color?**: `string`

#### bold?

> `optional` **bold?**: `boolean`

#### italic?

> `optional` **italic?**: `boolean`

#### indentLevel?

> `optional` **indentLevel?**: `number`

#### breakLine?

> `optional` **breakLine?**: `boolean`

#### paraSpaceBefore?

> `optional` **paraSpaceBefore?**: `number`

#### paraSpaceAfter?

> `optional` **paraSpaceAfter?**: `number`
