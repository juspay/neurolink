[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogEventEmitter

# Type Alias: LogEventEmitter

> **LogEventEmitter** = `object`

Defined in: [types/utilities.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L83)

Minimal emitter shape the logger forwards `"log-event"` payloads to.

Structurally satisfied by `node:events`' `EventEmitter` and by NeuroLink's
own typed emitter, so a sink can be either.

## Properties

### emit

> **emit**: (`event`, ...`args`) => `boolean`

Defined in: [types/utilities.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L84)

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`boolean`
