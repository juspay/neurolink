[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProviderName

# Type Alias: VideoProviderName

> **VideoProviderName** = `"vertex"` \| `"kling"` \| `"runway"` \| `"replicate"` \| `string` & `object`

Defined in: [types/multimodal.ts:153](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L153)

Known video provider identifiers shipped with NeuroLink.

`(string & {})` keeps the union open for custom provider names
registered via `VideoProcessor.registerHandler()`.
