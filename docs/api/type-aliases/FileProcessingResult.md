[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingResult

# Type Alias: FileProcessingResult

> **FileProcessingResult** = `object`

Defined in: [types/file.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L75)

File processing result after detection and conversion

## Properties

### type

> **type**: [`FileType`](FileType.md)

Defined in: [types/file.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L76)

---

### content

> **content**: `string` \| `Buffer`

Defined in: [types/file.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L77)

---

### mimeType

> **mimeType**: `string`

Defined in: [types/file.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L78)

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

Defined in: [types/file.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L80)

Additional images extracted from the file (e.g., video keyframes, audio cover art)

---

### metadata

> **metadata**: `object`

Defined in: [types/file.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L81)

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

#### version?

> `optional` **version?**: `string`

#### estimatedPages?

> `optional` **estimatedPages?**: `number` \| `null`

#### provider?

> `optional` **provider?**: `string`

#### apiType?

> `optional` **apiType?**: [`PDFAPIType`](PDFAPIType.md)

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
