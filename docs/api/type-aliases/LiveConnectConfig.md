[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1177)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1178)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1179)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1180)

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
