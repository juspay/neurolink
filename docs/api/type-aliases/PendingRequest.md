[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PendingRequest

# Type Alias: PendingRequest\<T\>

> **PendingRequest**\<`T`\> = `object`

Pending request in the batcher queue.

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

---

### tool

> **tool**: `string`

---

### args

> **args**: `unknown`

---

### serverId?

> `optional` **serverId?**: `string`

---

### resolve

> **resolve**: (`value`) => `void`

#### Parameters

##### value

`T`

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### addedAt

> **addedAt**: `number`
