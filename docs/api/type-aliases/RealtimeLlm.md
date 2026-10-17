[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeLlm

# Type Alias: RealtimeLlm

> **RealtimeLlm** = `object`

A LiveKit realtime model as far as callers of the model factory can rely on.
It is declared structurally so the published declarations name no optional
LiveKit plugin; at runtime it is a `RealtimeModel` subclass of the backend's
plugin.

## Properties

### model

> `readonly` **model**: `string`

---

### label

> **label**: () => `string`

#### Returns

`string`

---

### close

> **close**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
