[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TripwireConfig

# Type Alias: TripwireConfig

> **TripwireConfig** = `object`

Defined in: [types/ioProcessor.ts:122](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L122)

## Properties

### id

> **id**: `string`

Defined in: [types/ioProcessor.ts:123](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L123)

---

### name

> **name**: `string`

Defined in: [types/ioProcessor.ts:124](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L124)

---

### description

> **description**: `string`

Defined in: [types/ioProcessor.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L125)

---

### action

> **action**: [`TripwireAction`](TripwireAction.md)

Defined in: [types/ioProcessor.ts:126](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L126)

---

### condition

> **condition**: (`data`) => `boolean`

Defined in: [types/ioProcessor.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L127)

#### Parameters

##### data

[`TripwireData`](TripwireData.md)

#### Returns

`boolean`

---

### message?

> `optional` **message?**: `string` \| ((`data`) => `string`)

Defined in: [types/ioProcessor.ts:128](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ioProcessor.ts#L128)
