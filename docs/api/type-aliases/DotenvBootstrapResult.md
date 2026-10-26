[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DotenvBootstrapResult

# Type Alias: DotenvBootstrapResult

> **DotenvBootstrapResult** = `object`

## Properties

### loaded

> **loaded**: `boolean`

Whether a `.env` file was read.

---

### path?

> `optional` **path?**: `string`

Absolute path of the file that was (or would have been) read.

---

### supplied

> **supplied**: `string`[]

Variables the file supplied that were absent from the environment.

---

### endpointOverrides

> **endpointOverrides**: `string`[]

The subset of `supplied` that redirects traffic or file access: provider
`*_BASE_URL` / `*_ENDPOINT(S)` variables, `NEUROLINK_*_DIR` directories
and `DOTENV_CONFIG_PATH`. Still set unless listed under `refused`.

---

### refused

> **refused**: `string`[]

Endpoint overrides deleted again because the file is not owned by the
current user or is group/world-writable. Export them in the shell to use
them.

---

### reason?

> `optional` **reason?**: `string`

Why loading was skipped or overrides were refused, when either happened.
