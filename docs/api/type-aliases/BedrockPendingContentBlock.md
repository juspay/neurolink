[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockPendingContentBlock

# Type Alias: BedrockPendingContentBlock

> **BedrockPendingContentBlock** = [`BedrockContentBlock`](BedrockContentBlock.md) & `object`

Defined in: [types/providers.ts:1031](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L1031)

A Bedrock content block still being assembled from a ConverseStream event
sequence. `_inputBuffer` holds the partial tool-call JSON that arrives
across several `contentBlockDelta` events and is parsed away at
`contentBlockStop`, so it never appears on a finished block.

## Type Declaration

### \_inputBuffer?

> `optional` **\_inputBuffer?**: `string`
