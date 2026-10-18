[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanOptions

# Type Alias: SpanOptions

> **SpanOptions** = `object`

## Properties

### name

> **name**: `string`

---

### tracer

> **tracer**: `Tracer`

---

### observationType?

> `optional` **observationType?**: [`ObservationType`](ObservationType.md)

Marks the span as an observation of this type when it starts, which is what sends it to the exporters. Without it a span is exported only if its own code marks it with `observe`.

---

### kind?

> `optional` **kind?**: `SpanKind`

---

### attributes?

> `optional` **attributes?**: `Record`\<`string`, `string` \| `number` \| `boolean` \| `undefined`\>

---

### expectedFailure?

> `optional` **expectedFailure?**: (`error`) => `boolean`

Marks a thrown error as an expected skip whose Langfuse level the span set itself, so `withSpan` keeps it instead of raising ERROR.

#### Parameters

##### error

`unknown`

#### Returns

`boolean`

---

### detached?

> `optional` **detached?**: `boolean`

Keeps the span out of the active context, so spans started inside `fn` parent to the nearest ancestor that is exported.

---

### rootWhenOrphaned?

> `optional` **rootWhenOrphaned?**: `boolean`

With `detached`, lets the span be the active, exported root of its trace
when no span is active, so what it wraps stays in one trace instead of
each child starting its own. With an active ancestor it stays detached.
