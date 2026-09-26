[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileToolRootPolicy

# Type Alias: FileToolRootPolicy

> **FileToolRootPolicy** = `object`

The directories the built-in file tools (readFile, listDirectory,
writeFile, analyzeCSV) and bash's `cwd` argument may touch for one request.

`roots` are real, existing directories resolved once when the request
starts. `null` means the historical default: the process working
directory, read at call time. An empty array denies all file access.

## Properties

### roots

> `readonly` **roots**: readonly `string`[] \| `null`
