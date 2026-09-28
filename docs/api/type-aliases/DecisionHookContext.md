[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionHookContext

# Type Alias: DecisionHookContext

> **DecisionHookContext** = `object`

What a [DecisionHooks](DecisionHooks.md) callback sees before the call: the site, the
state NeuroLink is about to send, and NeuroLink's own questions — as
copies, so a hook that edits them cannot reach the wire request.

## Properties

### site

> **site**: [`DecisionSite`](DecisionSite.md)

---

### state

> **state**: [`DecisionState`](DecisionState.md)

---

### questions

> **questions**: [`DecisionQuestionMap`](DecisionQuestionMap.md)

NeuroLink's own questions for this site, keyed by its own ids.

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`
