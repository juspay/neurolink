[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpOutputNormalizerConfig

# Type Alias: McpOutputNormalizerConfig

> **McpOutputNormalizerConfig** = `object`

Defined in: [types/mcpOutput.ts:19](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcpOutput.ts#L19)

Configuration for McpOutputNormalizer.

## Properties

### strategy

> **strategy**: [`McpOutputStrategy`](McpOutputStrategy.md)

Defined in: [types/mcpOutput.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcpOutput.ts#L20)

---

### maxBytes

> **maxBytes**: `number`

Defined in: [types/mcpOutput.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcpOutput.ts#L22)

Byte ceiling above which the strategy fires.

---

### warnBytes

> **warnBytes**: `number`

Defined in: [types/mcpOutput.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcpOutput.ts#L24)

Bytes at which a warning is emitted while still inline.
