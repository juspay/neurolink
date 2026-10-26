[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProjectMcpConfigServerSummary

# Type Alias: ProjectMcpConfigServerSummary

> **ProjectMcpConfigServerSummary** = `object`

What a project config would do, reduced to what a human needs to see
before trusting it. Header and `env` values are deliberately absent: only
the `env` key names are listed, so a summary never echoes a secret.

## Properties

### id

> **id**: `string`

---

### transport

> **transport**: `string`

---

### command?

> `optional` **command?**: `string`

---

### args?

> `optional` **args?**: `string`[]

---

### url?

> `optional` **url?**: `string`

---

### envKeys?

> `optional` **envKeys?**: `string`[]
