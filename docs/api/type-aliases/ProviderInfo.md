[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderInfo

# Type Alias: ProviderInfo

> **ProviderInfo** = `object`

Defined in: [types/cli.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L699)

Provider information for setup display

## Properties

### id

> **id**: `string`

Defined in: [types/cli.ts:700](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L700)

---

### name

> **name**: `string`

Defined in: [types/cli.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L701)

---

### emoji

> **emoji**: `string`

Defined in: [types/cli.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L702)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:703](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L703)

---

### setupTime

> **setupTime**: `string`

Defined in: [types/cli.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L704)

---

### cost

> **cost**: `string`

Defined in: [types/cli.ts:705](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L705)

---

### difficulty?

> `optional` **difficulty?**: `"Easy"` \| `"Medium"` \| `"Hard"`

Defined in: [types/cli.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L706)

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/cli.ts:707](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L707)

---

### bestFor?

> `optional` **bestFor?**: `string`

Defined in: [types/cli.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L708)

---

### models?

> `optional` **models?**: `string`

Defined in: [types/cli.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L709)

---

### strengths?

> `optional` **strengths?**: `string`

Defined in: [types/cli.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L710)

---

### pricing?

> `optional` **pricing?**: `string`

Defined in: [types/cli.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L711)

---

### setupCommand?

> `optional` **setupCommand?**: `string`

Defined in: [types/cli.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L712)

---

### handler?

> `optional` **handler?**: (`argv`) => `Promise`\<`void`\>

Defined in: [types/cli.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L713)

#### Parameters

##### argv

###### check?

`boolean`

###### nonInteractive?

`boolean`

#### Returns

`Promise`\<`void`\>
