[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayBundle

# Type Alias: ProxyReplayBundle

> **ProxyReplayBundle** = `object`

Defined in: [types/proxy.ts:2873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2873)

Deterministic, redacted reconstruction of one captured proxy request.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2874)

---

### kind

> **kind**: `"neurolink.proxy.replay-bundle"`

Defined in: [types/proxy.ts:2875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2875)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2876)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2877)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2878)

#### logsDirectory

> **logsDirectory**: `string`

#### indexFiles

> **indexFiles**: `string`[]

---

### completeness

> **completeness**: `object`

Defined in: [types/proxy.ts:2882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2882)

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

Defined in: [types/proxy.ts:2891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2891)

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

Defined in: [types/proxy.ts:2905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2905)

---

### captures

> **captures**: [`ProxyReplayCapture`](ProxyReplayCapture.md)[]

Defined in: [types/proxy.ts:2906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2906)
