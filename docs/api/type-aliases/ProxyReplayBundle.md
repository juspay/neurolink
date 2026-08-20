[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayBundle

# Type Alias: ProxyReplayBundle

> **ProxyReplayBundle** = `object`

Defined in: [types/proxy.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2184)

Deterministic, redacted reconstruction of one captured proxy request.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2185)

---

### kind

> **kind**: `"neurolink.proxy.replay-bundle"`

Defined in: [types/proxy.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2186)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2187)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2188)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2189)

#### logsDirectory

> **logsDirectory**: `string`

#### indexFiles

> **indexFiles**: `string`[]

---

### completeness

> **completeness**: `object`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

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

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

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

Defined in: [types/proxy.ts:2216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2216)

---

### captures

> **captures**: [`ProxyReplayCapture`](ProxyReplayCapture.md)[]

Defined in: [types/proxy.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2217)
