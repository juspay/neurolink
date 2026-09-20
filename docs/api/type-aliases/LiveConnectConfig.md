[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1169)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1170)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1171)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1172](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1172)

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
