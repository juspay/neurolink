[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileFormatEntry

# Type Alias: FileFormatEntry

> **FileFormatEntry** = `object`

Defined in: [types/file.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L206)

One format in the canonical file-type registry.

`extensions[0]` and `mimeTypes[0]` are canonical; the remaining entries are
aliases accepted on input. See `processors/config/fileTypeRegistry.ts`.

## Properties

### label

> `readonly` **label**: `string`

Defined in: [types/file.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L208)

Human-readable format name, used in registry-conflict errors.

---

### extensions

> `readonly` **extensions**: readonly `string`[]

Defined in: [types/file.ts:210](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L210)

Extensions with leading dots, lowercase; first is canonical.

---

### mimeTypes

> `readonly` **mimeTypes**: readonly `string`[]

Defined in: [types/file.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L212)

MIME types, lowercase; first is canonical.

---

### fileType

> `readonly` **fileType**: [`FileType`](FileType.md)

Defined in: [types/file.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L214)

Routing type the detector emits for this format.

---

### modality

> `readonly` **modality**: [`FileModality`](FileModality.md)

Defined in: [types/file.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L216)

Category a human would put this format in.
