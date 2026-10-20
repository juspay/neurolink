[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / XaiObservedSession

# Type Alias: XaiObservedSession

> **XaiObservedSession** = `EventEmitter` & `object`

A session of the xAI plugin as far as the xai model's watcher needs it: an
event emitter (the plugin republishes every server event as
`openai_server_event_received`) that can be closed.

## Type Declaration

### close

> **close**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
