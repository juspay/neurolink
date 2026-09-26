[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogEventEmitter

# Type Alias: LogEventEmitter

> **LogEventEmitter** = `object`

Minimal emitter shape the logger forwards `"log-event"` payloads to.

Structurally satisfied by `node:events`' `EventEmitter` and by NeuroLink's
own typed emitter, so a sink can be either.

## Properties

### emit

> **emit**: (`event`, ...`args`) => `boolean`

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`boolean`
