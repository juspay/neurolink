[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionBeforeEvent

# Type Alias: DecisionBeforeEvent

> **DecisionBeforeEvent** = `object`

Payload of the `decision:before` event, emitted once per site call. `state`
and `questions` are copies: a listener that edits them changes neither
the request on the wire nor the consumer's own question objects.

## Properties

### site

> **site**: [`DecisionSite`](DecisionSite.md)

---

### state

> **state**: [`DecisionState`](DecisionState.md)

---

### questions

> **questions**: [`DecisionQuestionMap`](DecisionQuestionMap.md)

Everything about to be sent, NeuroLink's own questions plus the host's (namespaced).

---

### hostQuestionCount

> **hostQuestionCount**: `number`

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`
