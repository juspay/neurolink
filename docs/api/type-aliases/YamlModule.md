[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / YamlModule

# Type Alias: YamlModule

> **YamlModule** = `object`

Defined in: [types/proxy.ts:2893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2893)

Shape of the dynamically-imported js-yaml module. `dump` is optional —
read-only consumers (proxy config loader) only need `load`; writers
(CLI primary-account commands) check `dump` before calling.

## Properties

### dump?

> `optional` **dump?**: (`obj`, `opts?`) => `string`

Defined in: [types/proxy.ts:2895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2895)

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

Defined in: [types/proxy.ts:2896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2896)

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

Defined in: [types/proxy.ts:2894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2894)

#### Parameters

##### content

`string`

#### Returns

`unknown`
