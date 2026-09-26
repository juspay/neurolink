[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileRegistryOptions

# Type Alias: FileRegistryOptions

> **FileRegistryOptions** = `object`

Options for the file reference registry

## Properties

### tempDir?

> `optional` **tempDir?**: `string`

Directory for persisting file buffers (default: os.tmpdir()/neurolink-files/)

---

### maxFiles?

> `optional` **maxFiles?**: `number`

Maximum number of file references to keep (LRU eviction, default: 100)

---

### maxTempBytes?

> `optional` **maxTempBytes?**: `number`

Maximum total bytes to persist to temp (default: 1GB)

---

### defaultPreviewChars?

> `optional` **defaultPreviewChars?**: `number`

Default preview length in characters (default: 2000)
