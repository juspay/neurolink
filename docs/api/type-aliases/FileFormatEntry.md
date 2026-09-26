[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileFormatEntry

# Type Alias: FileFormatEntry

> **FileFormatEntry** = `object`

One format in the canonical file-type registry.

`extensions[0]` and `mimeTypes[0]` are canonical; the remaining entries are
aliases accepted on input. See `processors/config/fileTypeRegistry.ts`.

## Properties

### label

> `readonly` **label**: `string`

Human-readable format name, used in registry-conflict errors.

---

### extensions

> `readonly` **extensions**: readonly `string`[]

Extensions with leading dots, lowercase; first is canonical.

---

### mimeTypes

> `readonly` **mimeTypes**: readonly `string`[]

MIME types, lowercase; first is canonical.

---

### fileType

> `readonly` **fileType**: [`FileType`](FileType.md)

Routing type the detector emits for this format.

---

### modality

> `readonly` **modality**: [`FileModality`](FileModality.md)

Category a human would put this format in.
