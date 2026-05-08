[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NormalizedMcpOutput

# Type Alias: NormalizedMcpOutput

> **NormalizedMcpOutput** = `object`

Defined in: [types/mcpOutput.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcpOutput.ts#L35)

Value returned by McpOutputNormalizer.normalize().

## Properties

### result

> **result**: `unknown`

Defined in: [types/mcpOutput.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcpOutput.ts#L37)

The result to substitute for the raw callResult. May be a surrogate.

---

### isExternalized

> **isExternalized**: `boolean`

Defined in: [types/mcpOutput.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcpOutput.ts#L39)

Whether the full payload was written to the artifact store.

---

### artifactId?

> `optional` **artifactId?**: `string`

Defined in: [types/mcpOutput.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcpOutput.ts#L41)

Artifact ID when isExternalized === true.

---

### originalBytes

> **originalBytes**: `number`

Defined in: [types/mcpOutput.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcpOutput.ts#L43)

Serialized byte size of the original payload.
