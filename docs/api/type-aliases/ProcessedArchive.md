[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedArchive

# Type Alias: ProcessedArchive

> **ProcessedArchive** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:898](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L898)

Processed archive result.
Extends ProcessedFileBase with archive-specific metadata, entry listing,
and any security warnings encountered during processing.

## Type Declaration

### textContent

> **textContent**: `string`

### archiveMetadata

> **archiveMetadata**: `object`

#### archiveMetadata.format

> **format**: [`ArchiveFormat`](ArchiveFormat.md)

#### archiveMetadata.totalEntries

> **totalEntries**: `number`

#### archiveMetadata.totalUncompressedSize

> **totalUncompressedSize**: `number`

#### archiveMetadata.totalCompressedSize

> **totalCompressedSize**: `number`

### entries

> **entries**: [`ArchiveEntry`](ArchiveEntry.md)[]

### securityWarnings

> **securityWarnings**: `string`[]
