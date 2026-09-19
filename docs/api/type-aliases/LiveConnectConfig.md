[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1139)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1140)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1141)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1142)

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
