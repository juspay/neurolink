[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileExtractionParams

# Type Alias: FileExtractionParams

> **FileExtractionParams** = `object`

Parameters for targeted content extraction via extract_file_content tool.
Different file types use different subsets of these parameters.

## Properties

### file_id

> **file_id**: `string`

File ID (UUID) or filename

---

### start_time?

> `optional` **start_time?**: `number`

Start timestamp in seconds (video)

---

### end_time?

> `optional` **end_time?**: `number`

End timestamp in seconds (video)

---

### frame_count?

> `optional` **frame_count?**: `number`

Number of frames to extract in range (video, default: 5)

---

### pages?

> `optional` **pages?**: `number`[]

Specific page/slide numbers (1-indexed)

---

### page_range?

> `optional` **page_range?**: `object`

Page range (1-indexed, inclusive)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### sheet?

> `optional` **sheet?**: `string` \| `number`

Sheet name or 0-based index

---

### row_range?

> `optional` **row_range?**: `object`

Row range (1-indexed)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### columns?

> `optional` **columns?**: `string`[]

Specific columns (e.g., ["A", "B", "D"])

---

### entry_path?

> `optional` **entry_path?**: `string`

File path within the archive

---

### format?

> `optional` **format?**: `"text"` \| `"detailed"` \| `"summary"`

Output format hint
