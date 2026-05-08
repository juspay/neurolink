[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanSerializer

# Class: SpanSerializer

Defined in: [observability/utils/spanSerializer.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L22)

Utility class for span creation and serialization

## Constructors

### Constructor

> **new SpanSerializer**(): `SpanSerializer`

#### Returns

`SpanSerializer`

## Methods

### createSpan()

> `static` **createSpan**(`type`, `name`, `attributes?`, `parentSpanId?`, `traceId?`): [`SpanData`](../type-aliases/SpanData.md)

Defined in: [observability/utils/spanSerializer.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L30)

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

Defined in: [observability/utils/spanSerializer.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L65)

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

Defined in: [observability/utils/spanSerializer.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L85)

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

Defined in: [observability/utils/spanSerializer.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L105)

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

Defined in: [observability/utils/spanSerializer.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L121)

Serialize span to JSON for export

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`string`

---

### fromJSON()

> `static` **fromJSON**(`json`): [`SpanData`](../type-aliases/SpanData.md)

Defined in: [observability/utils/spanSerializer.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L146)

Parse span from JSON

#### Parameters

##### json

`string`

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

---

### toLangfuseFormat()

> `static` **toLangfuseFormat**(`span`): [`LangfuseSpan`](../type-aliases/LangfuseSpan.md)

Defined in: [observability/utils/spanSerializer.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L153)

Serialize span for Langfuse format

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

[`LangfuseSpan`](../type-aliases/LangfuseSpan.md)

---

### toLangSmithFormat()

> `static` **toLangSmithFormat**(`span`): [`LangSmithRun`](../type-aliases/LangSmithRun.md)

Defined in: [observability/utils/spanSerializer.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L189)

Serialize span for LangSmith format

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

[`LangSmithRun`](../type-aliases/LangSmithRun.md)

---

### toOtelFormat()

> `static` **toOtelFormat**(`span`): [`OtelSpan`](../type-aliases/OtelSpan.md)

Defined in: [observability/utils/spanSerializer.ts:209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L209)

Serialize span for OpenTelemetry format

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

[`OtelSpan`](../type-aliases/OtelSpan.md)

---

### createGenerationSpan()

> `static` **createGenerationSpan**(`params`): [`SpanData`](../type-aliases/SpanData.md)

Defined in: [observability/utils/spanSerializer.ts:320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L320)

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

Defined in: [observability/utils/spanSerializer.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L352)

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

Defined in: [observability/utils/spanSerializer.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L375)

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

Defined in: [observability/utils/spanSerializer.ts:401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L401)

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

Defined in: [observability/utils/spanSerializer.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L130)

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

Defined in: [observability/utils/spanSerializer.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/utils/spanSerializer.ts#L139)

Instance method to deserialize a JSON string to span data

#### Parameters

##### json

`string`

The JSON string to parse

#### Returns

[`SpanData`](../type-aliases/SpanData.md)

Parsed span data
