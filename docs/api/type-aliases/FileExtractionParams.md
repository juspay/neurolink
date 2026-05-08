[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileExtractionParams

# Type Alias: FileExtractionParams

> **FileExtractionParams** = `object`

Defined in: [types/fileReference.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L195)

Parameters for targeted content extraction via extract_file_content tool.
Different file types use different subsets of these parameters.

## Properties

### file_id

> **file_id**: `string`

Defined in: [types/fileReference.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L197)

File ID (UUID) or filename

---

### start_time?

> `optional` **start_time?**: `number`

Defined in: [types/fileReference.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L201)

Start timestamp in seconds (video)

---

### end_time?

> `optional` **end_time?**: `number`

Defined in: [types/fileReference.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L203)

End timestamp in seconds (video)

---

### frame_count?

> `optional` **frame_count?**: `number`

Defined in: [types/fileReference.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L205)

Number of frames to extract in range (video, default: 5)

---

### pages?

> `optional` **pages?**: `number`[]

Defined in: [types/fileReference.ts:209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L209)

Specific page/slide numbers (1-indexed)

---

### page_range?

> `optional` **page_range?**: `object`

Defined in: [types/fileReference.ts:211](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L211)

Page range (1-indexed, inclusive)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### sheet?

> `optional` **sheet?**: `string` \| `number`

Defined in: [types/fileReference.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L215)

Sheet name or 0-based index

---

### row_range?

> `optional` **row_range?**: `object`

Defined in: [types/fileReference.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L217)

Row range (1-indexed)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### columns?

> `optional` **columns?**: `string`[]

Defined in: [types/fileReference.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L219)

Specific columns (e.g., ["A", "B", "D"])

---

### entry_path?

> `optional` **entry_path?**: `string`

Defined in: [types/fileReference.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L223)

File path within the archive

---

### format?

> `optional` **format?**: `"text"` \| `"detailed"` \| `"summary"`

Defined in: [types/fileReference.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L227)

Output format hint
