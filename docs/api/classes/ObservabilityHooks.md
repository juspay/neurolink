[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ObservabilityHooks

# Class: ObservabilityHooks

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

##### Returns

`boolean`

#### Set Signature

> **set** **enabled**(`value`): `void`

Enable/disable observability

##### Parameters

###### value

`boolean`

##### Returns

`void`

## Methods

### setTraceContext()

> **setTraceContext**(`context`): `void`

Set trace context for all events

#### Parameters

##### context

[`EvaluationTraceContext`](../type-aliases/EvaluationTraceContext.md)

#### Returns

`void`

---

### clearTraceContext()

> **clearTraceContext**(): `void`

Clear trace context

#### Returns

`void`

---

### getTraceContext()

> **getTraceContext**(): [`EvaluationTraceContext`](../type-aliases/EvaluationTraceContext.md) \| `undefined`

Get current trace context

#### Returns

[`EvaluationTraceContext`](../type-aliases/EvaluationTraceContext.md) \| `undefined`

---

### on()

> **on**\<`K`\>(`event`, `handler`): () => `void`

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

Clear all handlers

#### Returns

`void`

---

### listenerCount()

> **listenerCount**(`event`): `number`

Get handler count for an event

#### Parameters

##### event

keyof [`EvaluationEvents`](../type-aliases/EvaluationEvents.md)

#### Returns

`number`
