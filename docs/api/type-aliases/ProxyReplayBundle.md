[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayBundle

# Type Alias: ProxyReplayBundle

> **ProxyReplayBundle** = `object`

Defined in: [types/proxy.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2294)

Deterministic, redacted reconstruction of one captured proxy request.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2295)

---

### kind

> **kind**: `"neurolink.proxy.replay-bundle"`

Defined in: [types/proxy.ts:2296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2296)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2297)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2298)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2299)

#### logsDirectory

> **logsDirectory**: `string`

#### indexFiles

> **indexFiles**: `string`[]

---

### completeness

> **completeness**: `object`

Defined in: [types/proxy.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2303)

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

Defined in: [types/proxy.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2312)

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

Defined in: [types/proxy.ts:2326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2326)

---

### captures

> **captures**: [`ProxyReplayCapture`](ProxyReplayCapture.md)[]

Defined in: [types/proxy.ts:2327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2327)
