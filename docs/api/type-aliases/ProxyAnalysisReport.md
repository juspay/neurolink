[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisReport

# Type Alias: ProxyAnalysisReport

> **ProxyAnalysisReport** = `object`

Defined in: [types/proxy.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2406)

## Properties

### runtime

> **runtime**: `object`

Defined in: [types/proxy.ts:2407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2407)

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

Defined in: [types/proxy.ts:2414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2414)

---

### since

> **since**: `string`

Defined in: [types/proxy.ts:2415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2415)

---

### until

> **until**: `string`

Defined in: [types/proxy.ts:2416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2416)

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2417)

---

### files

> **files**: `object`

Defined in: [types/proxy.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2418)

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

Defined in: [types/proxy.ts:2424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2424)

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

Defined in: [types/proxy.ts:2435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2435)

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

Defined in: [types/proxy.ts:2472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2472)

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

Defined in: [types/proxy.ts:2496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2496)

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

Defined in: [types/proxy.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2507)

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

Defined in: [types/proxy.ts:2514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2514)

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

Defined in: [types/proxy.ts:2520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2520)

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

Defined in: [types/proxy.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2529)

#### requestsWithUsage

> **requestsWithUsage**: `number`

#### requestsWithCacheRead

> **requestsWithCacheRead**: `number`

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

Defined in: [types/proxy.ts:2558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2558)

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

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)
