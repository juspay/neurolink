[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1126)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1127)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1128)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1129)

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
