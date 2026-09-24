[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisReport

# Type Alias: ProxyAnalysisReport

> **ProxyAnalysisReport** = `object`

Defined in: [types/proxy.ts:2517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2517)

## Properties

### runtime

> **runtime**: `object`

Defined in: [types/proxy.ts:2518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2518)

#### samples

> **samples**: `number`

#### maxEventLoopDelayMs

> **maxEventLoopDelayMs**: `number` \| `null`

#### maxRssBytes

> **maxRssBytes**: `number` \| `null`

#### maxCpuPercentOneCore

> **maxCpuPercentOneCore**: `number` \| `null`

#### maxHostLoad1m

> **maxHostLoad1m**: `number` \| `null`

---

### generatedAt

> **generatedAt**: `string`

Defined in: [types/proxy.ts:2525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2525)

---

### since

> **since**: `string`

Defined in: [types/proxy.ts:2526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2526)

---

### until

> **until**: `string`

Defined in: [types/proxy.ts:2527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2527)

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2528)

---

### files

> **files**: `object`

Defined in: [types/proxy.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2529)

#### lifecycle

> **lifecycle**: `number`

#### requests

> **requests**: `number`

#### attempts

> **attempts**: `number`

#### debug

> **debug**: `number`

---

### coverage

> **coverage**: `object`

Defined in: [types/proxy.ts:2535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2535)

#### lifecycle

> **lifecycle**: `boolean`

#### finalRequests

> **finalRequests**: `boolean`

#### attempts

> **attempts**: `boolean`

#### attemptLatency

> **attemptLatency**: `boolean`

#### cacheUsage

> **cacheUsage**: `boolean`

#### routingDecisions

> **routingDecisions**: `boolean`

#### comparableRequestAttempts

> **comparableRequestAttempts**: `boolean`

True only when every stream needed for cross-stream request/attempt
reconciliation begins at or before the requested analysis window.

---

### dataQuality

> **dataQuality**: `object`

Defined in: [types/proxy.ts:2546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2546)

#### linesRead

> **linesRead**: `number`

#### malformedLines

> **malformedLines**: `number`

#### unsupportedLifecycleLines

> **unsupportedLifecycleLines**: `number`

#### lifecycleSequenceGaps

> **lifecycleSequenceGaps**: `number`

#### lifecycleSequenceDuplicates

> **lifecycleSequenceDuplicates**: `number`

#### conflictingLifecycleDuplicates

> **conflictingLifecycleDuplicates**: `number`

#### duplicateAttempts

> **duplicateAttempts**: `number`

#### finalOutcomeConflicts

> **finalOutcomeConflicts**: `number`

#### acceptedWithoutFinal

> **acceptedWithoutFinal**: `number`

Missing evidence; may include in-flight or interrupted requests.

#### terminalWithoutFinal

> **terminalWithoutFinal**: `number`

#### streams

> **streams**: `Record`\<[`ProxyAnalysisStreamName`](ProxyAnalysisStreamName.md), \{ `observedFrom`: `string` \| `null`; `observedTo`: `string` \| `null`; `startsAtOrBeforeRequestedWindow`: `boolean`; `completeWindow`: `boolean`; \}\>

#### bodyArtifacts

> **bodyArtifacts**: `object`

##### bodyArtifacts.capturesIndexed

> **capturesIndexed**: `number`

##### bodyArtifacts.artifactsReferenced

> **artifactsReferenced**: `number`

##### bodyArtifacts.artifactsPresent

> **artifactsPresent**: `number`

##### bodyArtifacts.artifactsMissing

> **artifactsMissing**: `number`

##### bodyArtifacts.invalidPaths

> **invalidPaths**: `number`

##### bodyArtifacts.writeFailures

> **writeFailures**: `number`

##### bodyArtifacts.truncatedCaptures

> **truncatedCaptures**: `number`

#### routingDecisions

> **routingDecisions**: `object`

##### routingDecisions.valid

> **valid**: `number`

##### routingDecisions.invalid

> **invalid**: `number`

##### routingDecisions.absent

> **absent**: `number`

---

### lifecycle

> **lifecycle**: `object`

Defined in: [types/proxy.ts:2583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2583)

#### unconfirmedAtWorkerExit

> **unconfirmedAtWorkerExit**: `object`[]

Accepted requests lacking transport terminals when their worker exited.

#### accepted

> **accepted**: `number`

#### internalAccepted?

> `optional` **internalAccepted?**: `number`

#### internalTerminal?

> `optional` **internalTerminal?**: `number`

#### internalUnsettled?

> `optional` **internalUnsettled?**: `number`

#### auxiliaryRequests

> **auxiliaryRequests**: `number`

Accepted metadata requests that do not require model final records.

#### headers

> **headers**: `number`

#### firstChunks

> **firstChunks**: `number`

#### terminal

> **terminal**: `number`

#### unsettled

> **unsettled**: `number`

#### terminalOutcomes

> **terminalOutcomes**: `Record`\<`string`, `number`\>

#### errorTypes

> **errorTypes**: `Record`\<`string`, `number`\>

#### errorCodes

> **errorCodes**: `Record`\<`string`, `number`\>

---

### requests

> **requests**: `object`

Defined in: [types/proxy.ts:2607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2607)

#### completed

> **completed**: `number`

#### internalCompleted?

> `optional` **internalCompleted?**: `number`

Linked internal adapter finals excluded from client request totals.

#### success

> **success**: `number`

#### errors

> **errors**: `number`

#### finalRateLimits

> **finalRateLimits**: `number`

#### recoveredAfterRetry

> **recoveredAfterRetry**: `number`

#### errorTypes

> **errorTypes**: `Record`\<`string`, `number`\>

#### errorCodes

> **errorCodes**: `Record`\<`string`, `number`\>

---

### attempts

> **attempts**: `object`

Defined in: [types/proxy.ts:2618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2618)

#### total

> **total**: `number`

#### errors

> **errors**: `number`

#### errorTypes

> **errorTypes**: `Record`\<`string`, `number`\>

#### errorCodes

> **errorCodes**: `Record`\<`string`, `number`\>

#### transportScopes

> **transportScopes**: `Record`\<`string`, `number`\>

---

### rateLimits

> **rateLimits**: `object`

Defined in: [types/proxy.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2625)

#### attemptRateLimits

> **attemptRateLimits**: `number`

#### transient

> **transient**: `number`

#### quota

> **quota**: `number`

#### unclassified

> **unclassified**: `number`

---

### latencyMs

> **latencyMs**: `object`

Defined in: [types/proxy.ts:2631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2631)

#### headers

> **headers**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### firstChunk

> **firstChunk**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### firstUsefulOutput

> **firstUsefulOutput**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### terminal

> **terminal**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### finalRequest

> **finalRequest**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### attempt

> **attempt**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### singleAttemptDelta

> **singleAttemptDelta**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

---

### cache

> **cache**: `object`

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

#### requestsWithUsage

> **requestsWithUsage**: `number`

#### requestsWithCacheRead

> **requestsWithCacheRead**: `number`

#### requestsWithCacheObservation

> **requestsWithCacheObservation**: `number`

Turns whose cache breakdown the provider actually reported, and the
denominator of `requestHitRate`. A turn that reported none is not a
miss, so counting it would bias the rate down.

#### cacheReadTokens

> **cacheReadTokens**: `number`

#### cacheCreationTokens

> **cacheCreationTokens**: `number`

#### inputTokens

> **inputTokens**: `number`

Ordinary input, excluding the separately reported cache read/write buckets.

#### outputTokens

> **outputTokens**: `number`

#### requestHitRate

> **requestHitRate**: `number` \| `null`

#### estimatedCostUsd

> **estimatedCostUsd**: `number`

Summed per-request cost in USD. Records that carry no model, or whose
model matches no pricing table, contribute 0 — so this is a floor, not
an exact bill. `requestsPriced` says how many records actually priced.

#### requestsPriced

> **requestsPriced**: `number`

#### requestsPricedByPrefix

> **requestsPricedByPrefix**: `number`

Requests whose cost came from a longest-prefix fallback rather than an
exact pricing row — the rate is inherited from a similarly-named model
and may be wrong. Adding the real row makes these exact.

#### modelsPricedByPrefix

> **modelsPricedByPrefix**: `string`[]

Distinct models priced by prefix fallback, for the operator to chase.

#### requestsUnpriced

> **requestsUnpriced**: `number`

Requests carrying usage whose model matched no pricing row at all.

#### unpricedModels

> **unpricedModels**: `string`[]

Distinct models with no pricing row at all.

---

### routing

> **routing**: `object`

Defined in: [types/proxy.ts:2675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2675)

#### modes

> **modes**: `Record`\<`string`, `number`\>

#### selectionReasons

> **selectionReasons**: `Record`\<`string`, `number`\>

#### initialAccounts

> **initialAccounts**: `Record`\<`string`, `number`\>

#### finalAccountChanges

> **finalAccountChanges**: `number`

#### finalOutsideCandidateSet

> **finalOutsideCandidateSet**: `number`

#### totalRecords

> **totalRecords**: `number`

Number of routing decisions aggregated before sampling records.

#### records

> **records**: [`ProxyAnalysisRoutingRecord`](ProxyAnalysisRoutingRecord.md)[]

Most recent bounded sample retained for offline inspection.

---

### accounts

> **accounts**: [`ProxyAnalysisAccount`](ProxyAnalysisAccount.md)[]

Defined in: [types/proxy.ts:2686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2686)
