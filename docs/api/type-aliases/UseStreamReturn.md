[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseStreamReturn

# Type Alias: UseStreamReturn

> **UseStreamReturn** = `object`

Defined in: [types/client.ts:786](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L786)

useStream hook return type

## Properties

### start

> **start**: (`options`) => `void`

Defined in: [types/client.ts:788](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L788)

Start streaming

#### Parameters

##### options

`object` & [`UnknownRecord`](UnknownRecord.md)

#### Returns

`void`

---

### stop

> **stop**: () => `void`

Defined in: [types/client.ts:790](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L790)

Stop streaming

#### Returns

`void`

---

### text

> **text**: `string`

Defined in: [types/client.ts:792](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L792)

Current text content

---

### events

> **events**: [`ClientStreamEvent`](ClientStreamEvent.md)[]

Defined in: [types/client.ts:794](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L794)

All events received

---

### isStreaming

> **isStreaming**: `boolean`

Defined in: [types/client.ts:796](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L796)

Streaming state

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Defined in: [types/client.ts:798](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L798)

Error state
