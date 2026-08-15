[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarProviderName

# Type Alias: AvatarProviderName

> **AvatarProviderName** = `"d-id"` \| `"heygen"` \| `"replicate"` \| `"musetalk"` \| `string` & `object`

Defined in: [types/avatar.ts:32](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L32)

Known avatar provider identifiers shipped with NeuroLink.

`(string & {})` keeps the union open for custom provider names
registered via `AvatarProcessor.registerHandler()`.
