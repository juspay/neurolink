[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayBundle

# Type Alias: ProxyReplayBundle

> **ProxyReplayBundle** = `object`

Defined in: [types/proxy.ts:2923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2923)

Deterministic, redacted reconstruction of one captured proxy request.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2924)

---

### kind

> **kind**: `"neurolink.proxy.replay-bundle"`

Defined in: [types/proxy.ts:2925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2925)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2926)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2927)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2928)

#### logsDirectory

> **logsDirectory**: `string`

#### indexFiles

> **indexFiles**: `string`[]

---

### completeness

> **completeness**: `object`

Defined in: [types/proxy.ts:2932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2932)

#### captures

> **captures**: `number`

#### phasesPresent

> **phasesPresent**: `string`[]

#### missingRequiredPhases

> **missingRequiredPhases**: `string`[]

#### truncatedCaptures

> **truncatedCaptures**: `number`

#### artifactsWithIssues

> **artifactsWithIssues**: `number`

#### replayable

> **replayable**: `boolean`

#### blockers

> **blockers**: `string`[]

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2941)

#### method

> **method**: `string`

#### url

> **url**: `string` \| `null`

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### requiredHeaderInputs

> **requiredHeaderInputs**: `string`[]

#### body

> **body**: `string` \| `null`

#### bodySha256

> **bodySha256**: `string` \| `null`

#### bodyTruncated

> **bodyTruncated**: `boolean`

#### contentType

> **contentType**: `string` \| `null`

#### account

> **account**: `string` \| `null`

#### accountType

> **accountType**: `string` \| `null`

#### model

> **model**: `string` \| `null`

#### stream

> **stream**: `boolean` \| `null`

---

### capturedResponse

> **capturedResponse**: [`ProxyReplayCapture`](ProxyReplayCapture.md) \| `null`

Defined in: [types/proxy.ts:2955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2955)

---

### captures

> **captures**: [`ProxyReplayCapture`](ProxyReplayCapture.md)[]

Defined in: [types/proxy.ts:2956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2956)
