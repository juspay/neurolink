[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TripwireConfig

# Type Alias: TripwireConfig

> **TripwireConfig** = `object`

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### action

> **action**: [`TripwireAction`](TripwireAction.md)

---

### condition

> **condition**: (`data`) => `boolean`

#### Parameters

##### data

[`TripwireData`](TripwireData.md)

#### Returns

`boolean`

---

### message?

> `optional` **message?**: `string` \| ((`data`) => `string`)
