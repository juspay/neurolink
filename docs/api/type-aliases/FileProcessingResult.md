[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingResult

# Type Alias: FileProcessingResult

> **FileProcessingResult** = `object`

Defined in: [types/file.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L157)

File processing result after detection and conversion

## Properties

### type

> **type**: [`FileType`](FileType.md)

Defined in: [types/file.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L158)

---

### content

> **content**: `string` \| `Buffer`

Defined in: [types/file.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L159)

---

### mimeType

> **mimeType**: `string`

Defined in: [types/file.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L160)

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

Defined in: [types/file.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L162)

Additional images extracted from the file (e.g., video keyframes, audio cover art)

---

### metadata

> **metadata**: `object`

Defined in: [types/file.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L163)

#### confidence

> **confidence**: `number`

#### size?

> `optional` **size?**: `number`

#### filename?

> `optional` **filename?**: `string`

#### extension?

> `optional` **extension?**: `string` \| `null`

#### rowCount?

> `optional` **rowCount?**: `number`

#### totalLines?

> `optional` **totalLines?**: `number`

#### columnCount?

> `optional` **columnCount?**: `number`

#### columnNames?

> `optional` **columnNames?**: `string`[]

#### sampleData?

> `optional` **sampleData?**: `string` \| `unknown`[]

#### hasEmptyColumns?

> `optional` **hasEmptyColumns?**: `boolean`

#### columnMetadata?

> `optional` **columnMetadata?**: [`CSVColumnMetadata`](CSVColumnMetadata.md)[]

Enhanced column metadata with type detection and statistics

#### dataQualityWarnings?

> `optional` **dataQualityWarnings?**: [`CSVDataQualityWarning`](CSVDataQualityWarning.md)[]

Data quality warnings

#### dataQualityScore?

> `optional` **dataQualityScore?**: `number`

Overall data quality score (0-100)

#### hasHeaders?

> `optional` **hasHeaders?**: `boolean`

Whether headers were detected

#### detectedDelimiter?

> `optional` **detectedDelimiter?**: `string`

Detected delimiter

#### detectedEncoding?

> `optional` **detectedEncoding?**: `string`

Detected (or overridden) character encoding used to decode the CSV (#362)

#### encodingConfidence?

> `optional` **encodingConfidence?**: `number`

Confidence (0-100) of the detected encoding (#362)

#### columnNameMapping?

> `optional` **columnNameMapping?**: `object`[]

Original→sanitized column-name mapping when sanitizeColumnNames is on (#378)

#### parseTimedOut?

> `optional` **parseTimedOut?**: `boolean`

True when the parse hit its time budget and returned partial rows (#379)

#### version?

> `optional` **version?**: `string`

#### estimatedPages?

> `optional` **estimatedPages?**: `number` \| `null`

#### provider?

> `optional` **provider?**: `string`

#### apiType?

> `optional` **apiType?**: [`PDFAPIType`](PDFAPIType.md)

#### requiresCitations?

> `optional` **requiresCitations?**: `boolean` \| `"auto"`

Provider's citations requirement for visual PDF analysis (#349).

#### officeFormat?

> `optional` **officeFormat?**: [`OfficeDocumentType`](OfficeDocumentType.md)

#### pageCount?

> `optional` **pageCount?**: `number`

#### slideCount?

> `optional` **slideCount?**: `number`

#### sheetCount?

> `optional` **sheetCount?**: `number`

#### sheetNames?

> `optional` **sheetNames?**: `string`[]

#### author?

> `optional` **author?**: `string`

#### createdDate?

> `optional` **createdDate?**: `string`

#### modifiedDate?

> `optional` **modifiedDate?**: `string`

#### hasFormulas?

> `optional` **hasFormulas?**: `boolean`

#### hasImages?

> `optional` **hasImages?**: `boolean`

#### frameCount?

> `optional` **frameCount?**: `number`

#### hasKeyframes?

> `optional` **hasKeyframes?**: `boolean`
