[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / YamlModule

# Type Alias: YamlModule

> **YamlModule** = `object`

Defined in: [types/proxy.ts:3504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3504)

Shape of the dynamically-imported js-yaml module. `dump` is optional —
read-only consumers (proxy config loader) only need `load`; writers
(CLI primary-account commands) check `dump` before calling.

## Properties

### dump?

> `optional` **dump?**: (`obj`, `opts?`) => `string`

Defined in: [types/proxy.ts:3506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3506)

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

Defined in: [types/proxy.ts:3507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3507)

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

Defined in: [types/proxy.ts:3505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3505)

#### Parameters

##### content

`string`

#### Returns

`unknown`
