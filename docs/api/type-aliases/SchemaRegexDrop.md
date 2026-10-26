[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SchemaRegexDrop

# Type Alias: SchemaRegexDrop

> **SchemaRegexDrop** = `object`

One regular expression removed from a JSON Schema before the schema is
compiled, because `vetRegexPattern` judged it able to stall the process.
`path` is the JSON-pointer-like location of the keyword (`properties/name/pattern`).

## Properties

### path

> **path**: `string`

---

### pattern

> **pattern**: `string`

---

### reason

> **reason**: `string`
