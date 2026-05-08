[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ObservabilityHooks

# Class: ObservabilityHooks

Defined in: [evaluation/hooks/observabilityHooks.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L19)

Observability hooks manager

## Constructors

### Constructor

> **new ObservabilityHooks**(): `ObservabilityHooks`

#### Returns

`ObservabilityHooks`

## Accessors

### enabled

#### Get Signature

> **get** **enabled**(): `boolean`

Defined in: [evaluation/hooks/observabilityHooks.ts:31](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L31)

##### Returns

`boolean`

#### Set Signature

> **set** **enabled**(`value`): `void`

Defined in: [evaluation/hooks/observabilityHooks.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L27)

Enable/disable observability

##### Parameters

###### value

`boolean`

##### Returns

`void`

## Methods

### setTraceContext()

> **setTraceContext**(`context`): `void`

Defined in: [evaluation/hooks/observabilityHooks.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L38)

Set trace context for all events

#### Parameters

##### context

[`EvaluationTraceContext`](../type-aliases/EvaluationTraceContext.md)

#### Returns

`void`

---

### clearTraceContext()

> **clearTraceContext**(): `void`

Defined in: [evaluation/hooks/observabilityHooks.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L45)

Clear trace context

#### Returns

`void`

---

### getTraceContext()

> **getTraceContext**(): [`EvaluationTraceContext`](../type-aliases/EvaluationTraceContext.md) \| `undefined`

Defined in: [evaluation/hooks/observabilityHooks.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L52)

Get current trace context

#### Returns

[`EvaluationTraceContext`](../type-aliases/EvaluationTraceContext.md) \| `undefined`

---

### on()

> **on**\<`K`\>(`event`, `handler`): () => `void`

Defined in: [evaluation/hooks/observabilityHooks.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L59)

Register an event handler

#### Type Parameters

##### K

`K` _extends_ keyof [`EvaluationEvents`](../type-aliases/EvaluationEvents.md)

#### Parameters

##### event

`K`

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<[`EvaluationEvents`](../type-aliases/EvaluationEvents.md)\[`K`\]\>

#### Returns

() => `void`

---

### off()

> **off**\<`K`\>(`event`, `handler`): `void`

Defined in: [evaluation/hooks/observabilityHooks.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L80)

Remove an event handler

#### Type Parameters

##### K

`K` _extends_ keyof [`EvaluationEvents`](../type-aliases/EvaluationEvents.md)

#### Parameters

##### event

`K`

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<[`EvaluationEvents`](../type-aliases/EvaluationEvents.md)\[`K`\]\>

#### Returns

`void`

---

### emit()

> **emit**\<`K`\>(`event`, `data`): `Promise`\<`void`\>

Defined in: [evaluation/hooks/observabilityHooks.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L90)

Emit an event

#### Type Parameters

##### K

`K` _extends_ keyof [`EvaluationEvents`](../type-aliases/EvaluationEvents.md)

#### Parameters

##### event

`K`

##### data

`Omit`\<[`EvaluationEvents`](../type-aliases/EvaluationEvents.md)\[`K`\], `"traceContext"`\>

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `void`

Defined in: [evaluation/hooks/observabilityHooks.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L132)

Clear all handlers

#### Returns

`void`

---

### listenerCount()

> **listenerCount**(`event`): `number`

Defined in: [evaluation/hooks/observabilityHooks.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/hooks/observabilityHooks.ts#L139)

Get handler count for an event

#### Parameters

##### event

keyof [`EvaluationEvents`](../type-aliases/EvaluationEvents.md)

#### Returns

`number`
