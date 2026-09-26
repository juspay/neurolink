[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicOptions

# Type Alias: DynamicOptions

> **DynamicOptions** = `object`

Dynamic options for generate() and stream() — pass functions
instead of static values for context-aware resolution.

## Properties

### useKnowledgeGrounding?

> `optional` **useKnowledgeGrounding?**: `boolean`

Opt this call into the knowledge grounding configured on the NeuroLink
instance. This flag is intentionally static because grounding runs before
dynamic arguments are resolved.

---

### knowledgeContext?

> `optional` **knowledgeContext?**: [`KnowledgeRequestScope`](KnowledgeRequestScope.md)

Enabled integrations used to scope knowledge retrieval for this turn.
This scope is intentionally static for the same reason.

---

### model?

> `optional` **model?**: [`DynamicArgument`](DynamicArgument.md)\<`string`\>

---

### provider?

> `optional` **provider?**: [`DynamicArgument`](DynamicArgument.md)\<[`AIProviderName`](../enumerations/AIProviderName.md) \| `string`\>

---

### temperature?

> `optional` **temperature?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

---

### maxTokens?

> `optional` **maxTokens?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

---

### systemPrompt?

> `optional` **systemPrompt?**: [`DynamicArgument`](DynamicArgument.md)\<`string`\>

---

### tools?

> `optional` **tools?**: [`DynamicArgument`](DynamicArgument.md)\<`string`[]\>

Resolves to a `string[]` of tool names to enable.
The resolved array is merged into `enabledToolNames` (and from there
into `toolFilter`) — it does NOT replace `GenerateOptions.tools`,
which is a `Record<string, Tool>` map of tool definitions.

---

### timeout?

> `optional` **timeout?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`DynamicArgument`](DynamicArgument.md)\<`"minimal"` \| `"low"` \| `"medium"` \| `"high"`\>

---

### disableTools?

> `optional` **disableTools?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

---

### enableAnalytics?

> `optional` **enableAnalytics?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

---

### enableEvaluation?

> `optional` **enableEvaluation?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

---

### input

> **input**: `object`

#### text

> **text**: `string`

#### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files?**: (`Buffer` \| `string`)[]

---

### dynamicContext?

> `optional` **dynamicContext?**: `Record`\<`string`, `unknown`\>

Context passed to dynamic resolver functions — any shape you want.

This is intentionally separate from `GenerateOptions.context` (which is
for telemetry/tracing metadata). If your resolvers need values from
telemetry context (sessionId, userId, etc.), pass them here as well.
