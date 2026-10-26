[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / recordTrustedProjectMcpConfig

# Function: recordTrustedProjectMcpConfig()

> **recordTrustedProjectMcpConfig**(`configPath`, `sha256`, `storePath?`): `void`

Record an acceptance. The store directory is created `0700`, the file is
written `0600` through a uniquely named temporary file opened with `wx`
and renamed into place, so a concurrent writer or a pre-planted symlink
cannot redirect the write or leave a torn file.

## Parameters

### configPath

`string`

### sha256

`string`

### storePath?

`string` = `...`

## Returns

`void`
