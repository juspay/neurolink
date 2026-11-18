[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionSiteContext

# Type Alias: DecisionSiteContext

> **DecisionSiteContext** = `object`

What an internal decision site inherits from the `generate()` / `stream()`
call it runs inside: the per-call credentials (so the decision goes to the
caller's provider account, not the instance's), the abort signal, and the
ids a host's [DecisionHooks](DecisionHooks.md) may want to correlate on.

## Properties

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

---

### signal?

> `optional` **signal?**: `AbortSignal`

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`

---

### onProviderReturned?

> `optional` **onProviderReturned?**: () => `void`

Called each time the wire call returns, before any host hook runs, so the
caller can tell whether the provider itself met a deadline apart from the
time a host observer then spent.

#### Returns

`void`

---

### providerTimeoutMs?

> `optional` **providerTimeoutMs?**: `number`

A deadline, in whole milliseconds, for the provider call alone. It starts
right before the first wire dispatch (after any host `extendQuestions`
hook) and is shared by every attempt and backoff of this call.

---

### onProviderDeadline?

> `optional` **onProviderDeadline?**: (`signal`) => `void`

Receives the deadline signal when it starts.

#### Parameters

##### signal

`AbortSignal`

#### Returns

`void`
