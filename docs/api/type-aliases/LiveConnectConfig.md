[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1111)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1112)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1113)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1114)

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
