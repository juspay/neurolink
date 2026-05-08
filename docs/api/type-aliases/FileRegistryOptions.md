[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileRegistryOptions

# Type Alias: FileRegistryOptions

> **FileRegistryOptions** = `object`

Defined in: [types/fileReference.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L250)

Options for the file reference registry

## Properties

### tempDir?

> `optional` **tempDir?**: `string`

Defined in: [types/fileReference.ts:252](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L252)

Directory for persisting file buffers (default: os.tmpdir()/neurolink-files/)

---

### maxFiles?

> `optional` **maxFiles?**: `number`

Defined in: [types/fileReference.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L254)

Maximum number of file references to keep (LRU eviction, default: 100)

---

### maxTempBytes?

> `optional` **maxTempBytes?**: `number`

Defined in: [types/fileReference.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L256)

Maximum total bytes to persist to temp (default: 1GB)

---

### defaultPreviewChars?

> `optional` **defaultPreviewChars?**: `number`

Defined in: [types/fileReference.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L258)

Default preview length in characters (default: 2000)
