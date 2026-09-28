[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterInput

# Type Alias: ClassifierRouterInput

> **ClassifierRouterInput** = `object`

Lightweight request snapshot handed to the router.

## Properties

### prompt

> **prompt**: `string`

---

### estimatedInputTokens?

> `optional` **estimatedInputTokens?**: `number`

---

### hasTools?

> `optional` **hasTools?**: `boolean`

---

### requiresVision?

> `optional` **requiresVision?**: `boolean`

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `string`

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### sessionBound?

> `optional` **sessionBound?**: `boolean`

Whether this request is tied to a session, independent of the (withheld) session id itself.

---

### priorMessageCount?

> `optional` **priorMessageCount?**: `number`

Number of prior conversation messages the caller supplied, when known.

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

The outer request's per-call credentials, forwarded to the decision call
so it reaches the caller's provider account rather than the instance's.
Never part of the state sent to the model.

---

### signal?

> `optional` **signal?**: `AbortSignal`

The outer request's abort signal; an abandoned turn abandons its routing call.

---

### requestId?

> `optional` **requestId?**: `string`

The outer request's id, for hook and event correlation. Never sent to the model.
