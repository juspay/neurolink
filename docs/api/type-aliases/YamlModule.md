[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / YamlModule

# Type Alias: YamlModule

> **YamlModule** = `object`

Defined in: [types/proxy.ts:2789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2789)

Shape of the dynamically-imported js-yaml module. `dump` is optional —
read-only consumers (proxy config loader) only need `load`; writers
(CLI primary-account commands) check `dump` before calling.

## Properties

### dump?

> `optional` **dump?**: (`obj`, `opts?`) => `string`

Defined in: [types/proxy.ts:2791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2791)

#### Parameters

##### obj

`unknown`

##### opts?

`Record`\<`string`, `unknown`\>

#### Returns

`string`

---

### default?

> `optional` **default?**: `object`

Defined in: [types/proxy.ts:2792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2792)

#### load()

> **load**(`content`): `unknown`

##### Parameters

###### content

`string`

##### Returns

`unknown`

#### dump?

> `optional` **dump?**: (`obj`, `opts?`) => `string`

##### Parameters

###### obj

`unknown`

###### opts?

`Record`\<`string`, `unknown`\>

##### Returns

`string`

## Methods

### load()

> **load**(`content`): `unknown`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

#### Parameters

##### content

`string`

#### Returns

`unknown`
