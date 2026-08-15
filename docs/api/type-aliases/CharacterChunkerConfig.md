[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CharacterChunkerConfig

# Type Alias: CharacterChunkerConfig

> **CharacterChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:867](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L867)

Character chunker configuration
Simple character-based splitting

## Type Declaration

### separator?

> `optional` **separator?**: `string`

Character separator (default: "")

### keepSeparator?

> `optional` **keepSeparator?**: `boolean`

Keep separator in chunks
