[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1198](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1198)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1199)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1200)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1201)

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
