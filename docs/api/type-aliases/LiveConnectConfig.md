[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1116)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1117)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1118)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1119)

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
