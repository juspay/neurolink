[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanSerializer

# Class: SpanSerializer

Utility class for span creation and serialization

## Constructors

### Constructor

> **new SpanSerializer**(): `SpanSerializer`

#### Returns

`SpanSerializer`

## Methods

### createSpan()

> `static` **createSpan**(`type`, `name`, `attributes?`, `parentSpanId?`, `traceId?`): [`SpanData`](../type-aliases/SpanData.md)

Create a new span with generated IDs.

When `traceId` / `parentSpanId` are omitted, the method automatically
attempts to inherit them from the active OTel context so that Pipeline B
spans land inside the same Langfuse trace as Pipeline A spans (fix A5).

#### Parameters

##### type

[`SpanType`](../enumerations/SpanType.md)

##### name

`string`

##### attributes?

`Partial`\<[`SpanAttributes`](../type-aliases/SpanAttributes.md)\> = `{}`

##### parentSpanId?

`string`

##### traceId?

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### endSpan()

> `static` **endSpan**(`span`, `status?`, `statusMessage?`): [`SpanData`](../type-aliases/SpanData.md)

End a span with status

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

##### status?

[`SpanStatus`](../enumerations/SpanStatus.md) = `SpanStatus.OK`

##### statusMessage?

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### addEvent()

> `static` **addEvent**(`span`, `name`, `attributes?`): [`SpanData`](../type-aliases/SpanData.md)

Add event to span

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

##### name

`string`

##### attributes?

`Record`\<`string`, `unknown`\>

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### updateAttributes()

> `static` **updateAttributes**(`span`, `attributes`): [`SpanData`](../type-aliases/SpanData.md)

Update span attributes

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

##### attributes

`Partial`\<[`SpanAttributes`](../type-aliases/SpanAttributes.md)\>

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### toJSON()

> `static` **toJSON**(`span`): `string`

Serialize span to JSON for export

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`string`

---

### fromJSON()

> `static` **fromJSON**(`json`): [`SpanData`](../type-aliases/SpanData.md)

Parse span from JSON

#### Parameters

##### json

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### toLangfuseFormat()

> `static` **toLangfuseFormat**(`span`): [`LangfuseSpan`](../type-aliases/LangfuseSpan.md)

Serialize span for Langfuse format

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

[`LangfuseSpan`](../type-aliases/LangfuseSpan.md)

---

### toLangSmithFormat()

> `static` **toLangSmithFormat**(`span`): [`LangSmithRun`](../type-aliases/LangSmithRun.md)

Serialize span for LangSmith format

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

[`LangSmithRun`](../type-aliases/LangSmithRun.md)

---

### toOtelFormat()

> `static` **toOtelFormat**(`span`): [`OtelSpan`](../type-aliases/OtelSpan.md)

Serialize span for OpenTelemetry format

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

[`OtelSpan`](../type-aliases/OtelSpan.md)

---

### createGenerationSpan()

> `static` **createGenerationSpan**(`params`): [`SpanData`](../type-aliases/SpanData.md)

Create a generation span with AI-specific attributes

#### Parameters

##### params

###### provider

`string`

###### model

`string`

###### name?

`string`

###### parentSpanId?

`string`

###### traceId?

`string`

###### temperature?

`number`

###### maxTokens?

`number`

###### input?

`unknown`

###### userId?

`string`

###### sessionId?

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### createToolCallSpan()

> `static` **createToolCallSpan**(`params`): [`SpanData`](../type-aliases/SpanData.md)

Create a tool call span

#### Parameters

##### params

###### toolName

`string`

###### server?

`string`

###### input?

`unknown`

###### parentSpanId?

`string`

###### traceId?

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### enrichWithTokenUsage()

> `static` **enrichWithTokenUsage**(`span`, `usage`): [`SpanData`](../type-aliases/SpanData.md)

Enrich span with token usage

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

##### usage

###### promptTokens?

`number`

###### completionTokens?

`number`

###### totalTokens?

`number`

###### cacheCreationTokens?

`number`

###### cacheReadTokens?

`number`

###### reasoningTokens?

`number`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### enrichWithCost()

> `static` **enrichWithCost**(`span`, `cost`): [`SpanData`](../type-aliases/SpanData.md)

Enrich span with cost information

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

##### cost

###### inputCost?

`number`

###### outputCost?

`number`

###### totalCost

`number`

###### currency?

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### serialize()

> **serialize**(`span`): `string`

Instance method to serialize a span object to JSON string

#### Parameters

##### span

`Record`\<`string`, `unknown`\> \| `Partial`\<[`SpanData`](../type-aliases/SpanData.md)\>

The span data to serialize (can be partial span data)

#### Returns

`string`

JSON string representation of the span

---

### deserialize()

> **deserialize**(`json`): [`SpanData`](../type-aliases/SpanData.md)

Instance method to deserialize a JSON string to span data

#### Parameters

##### json

`string`

The JSON string to parse

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

Parsed span data
