[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProviderName

# Type Alias: VideoProviderName

> **VideoProviderName** = `"vertex"` \| `"kling"` \| `"runway"` \| `"replicate"` \| `string` & `object`

Defined in: [types/multimodal.ts:153](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L153)

Known video provider identifiers shipped with NeuroLink.

`(string & {})` keeps the union open for custom provider names
registered via `VideoProcessor.registerHandler()`.
