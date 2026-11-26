[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRulesFile

# Type Alias: ProviderRulesFile

> **ProviderRulesFile** = `object`

A provider's rules file. Each block is optional; a provider uses the ones it needs.

## Properties

### $schema?

> `optional` **$schema?**: `string`

---

### id

> **id**: `string`

Provider id, matching the AIProviderName value.

---

### errors?

> `optional` **errors?**: [`ProviderRuleErrors`](ProviderRuleErrors.md)

Error classification.

---

### finishReasons?

> `optional` **finishReasons?**: `Record`\<`string`, [`ProviderFinishReasonMap`](ProviderFinishReasonMap.md)\>

Finish-reason translation tables, by name (one wire can have several).

---

### usage?

> `optional` **usage?**: [`ProviderWireUsage`](ProviderWireUsage.md)

Where this wire reports each token count.

---

### contextWindows?

> `optional` **contextWindows?**: `Record`\<`string`, `Record`\<`string`, `number`\>\>

Context window per provider and model; `_default` is the provider fallback. Key order matters (first prefix match wins).

---

### contextWindowNotes?

> `optional` **contextWindowNotes?**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Why a context-window entry has its value, by provider and model.

---

### providerAliases?

> `optional` **providerAliases?**: `Record`\<`string`, `string`\>

Normalized provider spelling to the canonical `contextWindows` key.

---

### usageDialects?

> `optional` **usageDialects?**: `Record`\<`string`, [`ProviderUsageCountDialect`](ProviderUsageCountDialect.md)\>

Named prompt/completion/total layouts, for wires with several (SageMaker).

---

### usageFields?

> `optional` **usageFields?**: [`ProviderUsageFields`](ProviderUsageFields.md)

Where each token count lives in a raw usage object, in priority order.

---

### usageRebase?

> `optional` **usageRebase?**: [`ProviderUsageRebase`](ProviderUsageRebase.md)

When a cache-inclusive input count is rebased onto the uncached part.

---

### toolChoices?

> `optional` **toolChoices?**: `Record`\<`string`, [`ProviderToolChoiceMap`](ProviderToolChoiceMap.md)\>

How this wire spells a tool choice, by name (one wire can have several).

---

### toolNames?

> `optional` **toolNames?**: [`ProviderToolNameRules`](ProviderToolNameRules.md)

Which tool names this wire accepts, and how others are rewritten.

---

### modelFamilies?

> `optional` **modelFamilies?**: `Record`\<`string`, `string`[]\>

Named model-id families: case-insensitive regex sources, any match counts.

---

### modelFamilyNotes?

> `optional` **modelFamilyNotes?**: `Record`\<`string`, `string`\>

Why each model family holds the models it does.

---

### imageLimits?

> `optional` **imageLimits?**: `Record`\<`string`, `number` \| `Record`\<`string`, `number`\>\>

Images per request, by provider; an object gives a limit per model family.

---

### imageLimitDefault?

> `optional` **imageLimitDefault?**: `number`

Images per request for a provider missing from `imageLimits`.

---

### imageLimitNotes?

> `optional` **imageLimitNotes?**: `Record`\<`string`, `string`\>

Why an image limit has its value, by provider.

---

### proxyProviders?

> `optional` **proxyProviders?**: `string`[]

Providers that route to arbitrary models, so an unknown model passes.

---

### visionModels?

> `optional` **visionModels?**: `Record`\<`string`, `string`[]\>

Vision-capable model ids by provider (substring match); an empty list means no vision.

---

### visionModelNotes?

> `optional` **visionModelNotes?**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Notes on `visionModels`, by provider then model id ("\*" for the provider).

---

### visionFamilies?

> `optional` **visionFamilies?**: `Record`\<`string`, `string`\>

A `modelFamilies` name whose models count as vision-capable, by provider.

---

### modelFamilyLabels?

> `optional` **modelFamilyLabels?**: `object`

A label per model family: the first matching rule wins.

#### rules

> **rules**: [`ProviderModelRule`](ProviderModelRule.md)\<\{ `label`: `string`; \}\>[]

#### default

> **default**: `string`

---

### modelLists?

> `optional` **modelLists?**: `Record`\<`string`, `string`[]\>

Named lists of exact model ids.

---

### modelListNotes?

> `optional` **modelListNotes?**: `Record`\<`string`, `string`\>

Why each model list holds the models it does.

---

### reasoning?

> `optional` **reasoning?**: [`ProviderReasoningRules`](ProviderReasoningRules.md)

Thinking (reasoning) defaults and per-model budgets.

---

### reasoningNotes?

> `optional` **reasoningNotes?**: `Record`\<`string`, `string`\>

Why the reasoning values are what they are, by key.

---

### apiKeyFormats?

> `optional` **apiKeyFormats?**: `Record`\<`string`, `string`\>

API key format (regex source) by provider.

---

### apiKeyLengths?

> `optional` **apiKeyLengths?**: `Record`\<`string`, `number`\>

API key lengths quoted in configuration hints, by name.

---

### oauthTokenFormats?

> `optional` **oauthTokenFormats?**: `Record`\<`string`, `string`\>

OAuth token format (regex source) by token kind.

---

### credentialFormatNotes?

> `optional` **credentialFormatNotes?**: `Record`\<`string`, `string`\>

Notes on the key and token formats, by key.

---

### thinkingLimits?

> `optional` **thinkingLimits?**: [`ProviderThinkingLimits`](ProviderThinkingLimits.md)

Extended-thinking budget limits (Anthropic Messages).

---

### thinkingLimitNotes?

> `optional` **thinkingLimitNotes?**: `Record`\<`string`, `string`\>

Why each thinking limit is what it is, by key.

---

### defaultModel?

> `optional` **defaultModel?**: `string`

The model a provider uses when neither the call nor the environment names one.

---

### defaultModelNote?

> `optional` **defaultModelNote?**: `string`

Why the default model is the one it is.

---

### fallbackModel?

> `optional` **fallbackModel?**: `string`

The model a provider falls back to when none is configured.

---

### fallbackModelNote?

> `optional` **fallbackModelNote?**: `string`

Why the fallback model is the one it is.

---

### errorSignals?

> `optional` **errorSignals?**: `Record`\<`string`, `string`[]\>

Named error-text signals: case-insensitive regex sources, any match counts.

---

### errorSignalNotes?

> `optional` **errorSignalNotes?**: `Record`\<`string`, `string`\>

Why each error signal holds the patterns it does.

---

### requestDefaults?

> `optional` **requestDefaults?**: [`ProviderRequestDefaults`](ProviderRequestDefaults.md)

Request defaults the provider fills in when the caller leaves them out.

---

### requestDefaultNotes?

> `optional` **requestDefaultNotes?**: `Record`\<`string`, `string`\>

Why each request default is what it is, by key.

---

### requestFields?

> `optional` **requestFields?**: [`ProviderRequestFields`](ProviderRequestFields.md)

Wire names of request parameters, by neutral name.

---

### requestFieldNotes?

> `optional` **requestFieldNotes?**: `Record`\<`string`, `string`\>

Why the request field names read as they do.

---

### toolResults?

> `optional` **toolResults?**: [`ProviderToolResultRules`](ProviderToolResultRules.md)

How a failed tool call is reported back to the model.

---

### contextTexts?

> `optional` **contextTexts?**: [`ProviderContextTexts`](ProviderContextTexts.md)

Fixed texts inserted into the conversation.

---

### finalResultTool?

> `optional` **finalResultTool?**: [`ProviderFinalResultTool`](ProviderFinalResultTool.md)

The internal tool a model calls to return structured output.

---

### finalResultToolNotes?

> `optional` **finalResultToolNotes?**: `Record`\<`string`, `string`\>

Why the final-result tool and its instructions read as they do.
