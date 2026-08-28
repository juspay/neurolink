[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockPendingContentBlock

# Type Alias: BedrockPendingContentBlock

> **BedrockPendingContentBlock** = [`BedrockContentBlock`](BedrockContentBlock.md) & `object`

Defined in: [types/providers.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1035)

A Bedrock content block still being assembled from a ConverseStream event
sequence. `_inputBuffer` holds the partial tool-call JSON that arrives
across several `contentBlockDelta` events and is parsed away at
`contentBlockStop`, so it never appears on a finished block.

## Type Declaration

### \_inputBuffer?

> `optional` **\_inputBuffer?**: `string`
