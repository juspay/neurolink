[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProjectMcpConfigSummary

# Type Alias: ProjectMcpConfigSummary

> **ProjectMcpConfigSummary** = `object`

## Properties

### path

> **path**: `string`

Absolute path of the config file.

---

### sha256

> **sha256**: `string`

Lower-case hex SHA-256 of the file's bytes.

---

### servers

> **servers**: [`ProjectMcpConfigServerSummary`](ProjectMcpConfigServerSummary.md)[]

---

### parseError?

> `optional` **parseError?**: `string`

Set when the file is not valid JSON or has no `mcpServers` object.
