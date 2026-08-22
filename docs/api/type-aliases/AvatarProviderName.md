[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarProviderName

# Type Alias: AvatarProviderName

> **AvatarProviderName** = `"d-id"` \| `"heygen"` \| `"replicate"` \| `"musetalk"` \| `string` & `object`

Defined in: [types/avatar.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L32)

Known avatar provider identifiers shipped with NeuroLink.

`(string & {})` keeps the union open for custom provider names
registered via `AvatarProcessor.registerHandler()`.
