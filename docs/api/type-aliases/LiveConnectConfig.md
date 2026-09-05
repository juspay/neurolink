[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1137)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1138)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1139)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1140)

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
