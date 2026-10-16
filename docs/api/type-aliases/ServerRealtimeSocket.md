[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerRealtimeSocket

# Type Alias: ServerRealtimeSocket

> **ServerRealtimeSocket** = `object`

The parts of a `ws` socket the realtime handler uses.

## Properties

### readyState

> `readonly` **readyState**: `number`

## Methods

### send()

> **send**(`data`): `void`

#### Parameters

##### data

`string`

#### Returns

`void`

---

### close()

> **close**(`code?`, `reason?`): `void`

#### Parameters

##### code?

`number`

##### reason?

`string`

#### Returns

`void`

---

### on()

#### Call Signature

> **on**(`event`, `listener`): `unknown`

##### Parameters

###### event

`"message"`

###### listener

(`data`, `isBinary`) => `void`

##### Returns

`unknown`

#### Call Signature

> **on**(`event`, `listener`): `unknown`

##### Parameters

###### event

`"error"` \| `"close"`

###### listener

() => `void`

##### Returns

`unknown`
