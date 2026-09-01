[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1133)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1134](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1134)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1135)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1136)

#### responseModalities

> **responseModalities**: (`"TEXT"` \| `"IMAGE"` \| `"AUDIO"`)[]

#### speechConfig

> **speechConfig**: `object`

##### speechConfig.voiceConfig

> **voiceConfig**: `object`

##### speechConfig.voiceConfig.prebuiltVoiceConfig

> **prebuiltVoiceConfig**: `object`

##### speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName

> **voiceName**: `string`
