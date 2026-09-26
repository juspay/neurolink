[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1196](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1196)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1197)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1198](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1198)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1199)

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
