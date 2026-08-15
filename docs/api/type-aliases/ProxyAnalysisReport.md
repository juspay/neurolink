[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisReport

# Type Alias: ProxyAnalysisReport

> **ProxyAnalysisReport** = `object`

Defined in: [types/proxy.ts:1852](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1852)

## Properties

### generatedAt

> **generatedAt**: `string`

Defined in: [types/proxy.ts:1853](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1853)

---

### since

> **since**: `string`

Defined in: [types/proxy.ts:1854](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1854)

---

### until

> **until**: `string`

Defined in: [types/proxy.ts:1855](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1855)

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1856](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1856)

---

### files

> **files**: `object`

Defined in: [types/proxy.ts:1857](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1857)

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

Defined in: [types/proxy.ts:1863](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1863)

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

Defined in: [types/proxy.ts:1874](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1874)

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

Defined in: [types/proxy.ts:1905](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1905)

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

Defined in: [types/proxy.ts:1915](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1915)

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

Defined in: [types/proxy.ts:1924](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1924)

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

Defined in: [types/proxy.ts:1931](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1931)

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

Defined in: [types/proxy.ts:1937](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1937)

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

Defined in: [types/proxy.ts:1945](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1945)

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

#### requestHitRate

> **requestHitRate**: `number` \| `null`

---

### routing

> **routing**: `object`

Defined in: [types/proxy.ts:1953](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1953)

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

Defined in: [types/proxy.ts:1964](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1964)
