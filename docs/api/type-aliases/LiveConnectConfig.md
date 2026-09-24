[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1189)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1190)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1191)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1192)

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
