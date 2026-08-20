[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisReport

# Type Alias: ProxyAnalysisReport

> **ProxyAnalysisReport** = `object`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

## Properties

### generatedAt

> **generatedAt**: `string`

Defined in: [types/proxy.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1884)

---

### since

> **since**: `string`

Defined in: [types/proxy.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1885)

---

### until

> **until**: `string`

Defined in: [types/proxy.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1886)

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)

---

### files

> **files**: `object`

Defined in: [types/proxy.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1888)

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

Defined in: [types/proxy.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1894)

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

Defined in: [types/proxy.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1905)

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

Defined in: [types/proxy.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1936)

#### accepted

> **accepted**: `number`

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

Defined in: [types/proxy.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1946)

#### completed

> **completed**: `number`

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

Defined in: [types/proxy.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1955)

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

Defined in: [types/proxy.ts:1962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1962)

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

Defined in: [types/proxy.ts:1968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1968)

#### headers

> **headers**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

#### firstChunk

> **firstChunk**: [`ProxyLatencySummary`](ProxyLatencySummary.md)

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

Defined in: [types/proxy.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1976)

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

Defined in: [types/proxy.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2004)

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

Defined in: [types/proxy.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2015)
