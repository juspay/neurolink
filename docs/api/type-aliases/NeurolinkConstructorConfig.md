[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkConstructorConfig

# Type Alias: NeurolinkConstructorConfig

> **NeurolinkConstructorConfig** = `object`

Defined in: [types/config.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L56)

Configuration object for NeuroLink constructor.

## Properties

### conversationMemory?

> `optional` **conversationMemory?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/config.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L57)

---

### enableOrchestration?

> `optional` **enableOrchestration?**: `boolean`

Defined in: [types/config.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L58)

---

### hitl?

> `optional` **hitl?**: [`HITLConfig`](HITLConfig.md)

Defined in: [types/config.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L59)

---

### toolRegistry?

> `optional` **toolRegistry?**: [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

Defined in: [types/config.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L60)

---

### observability?

> `optional` **observability?**: [`ObservabilityConfig`](ObservabilityConfig.md)

Defined in: [types/config.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L61)

---

### modelAliasConfig?

> `optional` **modelAliasConfig?**: [`ModelAliasConfig`](ModelAliasConfig.md)

Defined in: [types/config.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L62)

---

### mcp?

> `optional` **mcp?**: [`MCPEnhancementsConfig`](MCPEnhancementsConfig.md)

Defined in: [types/config.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L64)

MCP enhancement modules configuration (cache, router, batcher, annotations, middleware)

---

### auth?

> `optional` **auth?**: [`NeuroLinkAuthConfig`](NeuroLinkAuthConfig.md)

Defined in: [types/config.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L66)

Authentication provider configuration

---

### tasks?

> `optional` **tasks?**: [`TaskManagerConfig`](TaskManagerConfig.md)

Defined in: [types/config.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L68)

TaskManager configuration (scheduled and self-running tasks)

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/config.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L74)

Per-provider credential overrides.
When set here, applies as the default for all generate()/stream() calls
from this NeuroLink instance. Per-call credentials override these.

---

### providerFallback?

> `optional` **providerFallback?**: [`ProviderFallbackCallback`](ProviderFallbackCallback.md)

Defined in: [types/config.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L81)

Curator P2-3: callback invoked on model-access-denied. Lets a host (e.g.
Curator) centrally drive fallback policy. The callback receives the
original error and returns the next `{ provider, model }` to try, or
`null` to bubble the error.

---

### modelChain?

> `optional` **modelChain?**: `string`[]

Defined in: [types/config.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L87)

Curator P2-3: ordered list of model names to try in sequence on
model-access-denied. Sugar over `providerFallback`. The current
provider is preserved across the chain; only the model name changes.
