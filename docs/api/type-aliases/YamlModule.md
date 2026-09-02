[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / YamlModule

# Type Alias: YamlModule

> **YamlModule** = `object`

Defined in: [types/proxy.ts:2878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2878)

Shape of the dynamically-imported js-yaml module. `dump` is optional —
read-only consumers (proxy config loader) only need `load`; writers
(CLI primary-account commands) check `dump` before calling.

## Properties

### dump?

> `optional` **dump?**: (`obj`, `opts?`) => `string`

Defined in: [types/proxy.ts:2880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2880)

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

Defined in: [types/proxy.ts:2881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2881)

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

Defined in: [types/proxy.ts:2879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2879)

#### Parameters

##### content

`string`

#### Returns

`unknown`
