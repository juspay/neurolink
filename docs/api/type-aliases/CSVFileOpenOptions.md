[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVFileOpenOptions

# Type Alias: CSVFileOpenOptions

> **CSVFileOpenOptions** = `object`

How `CSVProcessor.parseCSVFile` opens the file.

`followSymlinks: false` opens with O_NOFOLLOW, so a symlink at the final
path component is refused (ELOOP) rather than followed. The sandboxed
analyzeCSV tool passes it after containment has resolved the real path,
closing the window between that check and the open. Defaults to `true`; on
Windows, where O_NOFOLLOW does not exist, the option has no effect.

## Properties

### followSymlinks?

> `optional` **followSymlinks?**: `boolean`
