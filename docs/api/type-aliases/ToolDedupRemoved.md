[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDedupRemoved

# Type Alias: ToolDedupRemoved

> **ToolDedupRemoved** = `object`

Defined in: [types/toolDedup.ts:34](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L34)

Record produced for each tool collapsed by the dedup pass.

## Properties

### name

> **name**: `string`

Defined in: [types/toolDedup.ts:36](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L36)

Name of the tool that was collapsed.

---

### duplicateOf

> **duplicateOf**: `string`

Defined in: [types/toolDedup.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L38)

Name of the representative tool that this one was collapsed into.

---

### similarity

> **similarity**: `number`

Defined in: [types/toolDedup.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L40)

Similarity score that triggered the collapse (in [0, 1]).
