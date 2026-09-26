[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderInfo

# Type Alias: ProviderInfo

> **ProviderInfo** = `object`

Defined in: [types/cli.ts:705](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L705)

Provider information for setup display

## Properties

### id

> **id**: `string`

Defined in: [types/cli.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L706)

---

### name

> **name**: `string`

Defined in: [types/cli.ts:707](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L707)

---

### emoji

> **emoji**: `string`

Defined in: [types/cli.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L708)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L709)

---

### setupTime

> **setupTime**: `string`

Defined in: [types/cli.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L710)

---

### cost

> **cost**: `string`

Defined in: [types/cli.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L711)

---

### difficulty?

> `optional` **difficulty?**: `"Easy"` \| `"Medium"` \| `"Hard"`

Defined in: [types/cli.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L712)

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/cli.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L713)

---

### bestFor?

> `optional` **bestFor?**: `string`

Defined in: [types/cli.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L714)

---

### models?

> `optional` **models?**: `string`

Defined in: [types/cli.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L715)

---

### strengths?

> `optional` **strengths?**: `string`

Defined in: [types/cli.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L716)

---

### pricing?

> `optional` **pricing?**: `string`

Defined in: [types/cli.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L717)

---

### setupCommand?

> `optional` **setupCommand?**: `string`

Defined in: [types/cli.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L718)

---

### handler?

> `optional` **handler?**: (`argv`) => `Promise`\<`void`\>

Defined in: [types/cli.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L719)

#### Parameters

##### argv

###### check?

`boolean`

###### nonInteractive?

`boolean`

#### Returns

`Promise`\<`void`\>
