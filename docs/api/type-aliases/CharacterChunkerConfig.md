[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CharacterChunkerConfig

# Type Alias: CharacterChunkerConfig

> **CharacterChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:823](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L823)

Character chunker configuration
Simple character-based splitting

## Type Declaration

### separator?

> `optional` **separator?**: `string`

Character separator (default: "")

### keepSeparator?

> `optional` **keepSeparator?**: `boolean`

Keep separator in chunks
