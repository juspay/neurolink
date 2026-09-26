[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NormalizedMcpOutput

# Type Alias: NormalizedMcpOutput

> **NormalizedMcpOutput** = `object`

Value returned by McpOutputNormalizer.normalize().

## Properties

### result

> **result**: `unknown`

The result to substitute for the raw callResult. May be a surrogate.

---

### isExternalized

> **isExternalized**: `boolean`

Whether the full payload was written to the artifact store.

---

### artifactId?

> `optional` **artifactId?**: `string`

Artifact ID when isExternalized === true.

---

### originalBytes

> **originalBytes**: `number`

Serialized byte size of the original payload.
