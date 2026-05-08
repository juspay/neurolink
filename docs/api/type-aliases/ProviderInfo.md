[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderInfo

# Type Alias: ProviderInfo

> **ProviderInfo** = `object`

Defined in: [types/cli.ts:677](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L677)

Provider information for setup display

## Properties

### id

> **id**: `string`

Defined in: [types/cli.ts:678](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L678)

---

### name

> **name**: `string`

Defined in: [types/cli.ts:679](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L679)

---

### emoji

> **emoji**: `string`

Defined in: [types/cli.ts:680](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L680)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:681](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L681)

---

### setupTime

> **setupTime**: `string`

Defined in: [types/cli.ts:682](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L682)

---

### cost

> **cost**: `string`

Defined in: [types/cli.ts:683](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L683)

---

### difficulty?

> `optional` **difficulty?**: `"Easy"` \| `"Medium"` \| `"Hard"`

Defined in: [types/cli.ts:684](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L684)

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/cli.ts:685](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L685)

---

### bestFor?

> `optional` **bestFor?**: `string`

Defined in: [types/cli.ts:686](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L686)

---

### models?

> `optional` **models?**: `string`

Defined in: [types/cli.ts:687](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L687)

---

### strengths?

> `optional` **strengths?**: `string`

Defined in: [types/cli.ts:688](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L688)

---

### pricing?

> `optional` **pricing?**: `string`

Defined in: [types/cli.ts:689](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L689)

---

### setupCommand?

> `optional` **setupCommand?**: `string`

Defined in: [types/cli.ts:690](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L690)

---

### handler?

> `optional` **handler?**: (`argv`) => `Promise`\<`void`\>

Defined in: [types/cli.ts:691](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L691)

#### Parameters

##### argv

###### check?

`boolean`

###### nonInteractive?

`boolean`

#### Returns

`Promise`\<`void`\>
