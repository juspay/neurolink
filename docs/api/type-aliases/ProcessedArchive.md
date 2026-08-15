[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedArchive

# Type Alias: ProcessedArchive

> **ProcessedArchive** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:954](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L954)

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
