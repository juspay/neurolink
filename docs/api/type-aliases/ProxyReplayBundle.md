[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayBundle

# Type Alias: ProxyReplayBundle

> **ProxyReplayBundle** = `object`

Defined in: [types/proxy.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2282)

Deterministic, redacted reconstruction of one captured proxy request.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2283)

---

### kind

> **kind**: `"neurolink.proxy.replay-bundle"`

Defined in: [types/proxy.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2284)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2285)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2286)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2287)

#### logsDirectory

> **logsDirectory**: `string`

#### indexFiles

> **indexFiles**: `string`[]

---

### completeness

> **completeness**: `object`

Defined in: [types/proxy.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2291)

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

Defined in: [types/proxy.ts:2300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2300)

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

Defined in: [types/proxy.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2314)

---

### captures

> **captures**: [`ProxyReplayCapture`](ProxyReplayCapture.md)[]

Defined in: [types/proxy.ts:2315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2315)
