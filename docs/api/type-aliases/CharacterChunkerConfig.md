[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CharacterChunkerConfig

# Type Alias: CharacterChunkerConfig

> **CharacterChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:867](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L867)

Character chunker configuration
Simple character-based splitting

## Type Declaration

### separator?

> `optional` **separator?**: `string`

Character separator (default: "")

### keepSeparator?

> `optional` **keepSeparator?**: `boolean`

Keep separator in chunks
