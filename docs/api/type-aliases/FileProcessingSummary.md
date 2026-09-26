[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingSummary

# Type Alias: FileProcessingSummary

> **FileProcessingSummary** = `object`

Summary of file processing operations.

## Properties

### totalFiles

> **totalFiles**: `number`

---

### processedFiles

> **processedFiles**: `object`[]

#### filename

> **filename**: `string`

#### size?

> `optional` **size?**: `number`

#### type?

> `optional` **type?**: `string`

---

### failedFiles

> **failedFiles**: `object`[]

#### filename

> **filename**: `string`

#### error

> **error**: [`FileProcessingError`](FileProcessingError.md)

---

### skippedFiles

> **skippedFiles**: `object`[]

#### filename

> **filename**: `string`

#### reason

> **reason**: `string`

#### suggestedAlternative?

> `optional` **suggestedAlternative?**: `string`

---

### warnings

> **warnings**: `object`[]

#### filename

> **filename**: `string`

#### message

> **message**: `string`
