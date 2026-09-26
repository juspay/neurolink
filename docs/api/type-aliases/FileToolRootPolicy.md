[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileToolRootPolicy

# Type Alias: FileToolRootPolicy

> **FileToolRootPolicy** = `object`

Defined in: [types/fileToolRoots.ts:16](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileToolRoots.ts#L16)

The directories the built-in file tools (readFile, listDirectory,
writeFile, analyzeCSV) and bash's `cwd` argument may touch for one request.

`roots` are real, existing directories resolved once when the request
starts. `null` means the historical default: the process working
directory, read at call time. An empty array denies all file access.

## Properties

### roots

> `readonly` **roots**: readonly `string`[] \| `null`

Defined in: [types/fileToolRoots.ts:17](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileToolRoots.ts#L17)
