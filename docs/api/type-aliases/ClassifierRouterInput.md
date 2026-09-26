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
