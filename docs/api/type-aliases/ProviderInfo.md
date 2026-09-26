[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderInfo

# Type Alias: ProviderInfo

> **ProviderInfo** = `object`

Provider information for setup display

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### emoji

> **emoji**: `string`

---

### description

> **description**: `string`

---

### setupTime

> **setupTime**: `string`

---

### cost

> **cost**: `string`

---

### difficulty?

> `optional` **difficulty?**: `"Easy"` \| `"Medium"` \| `"Hard"`

---

### features?

> `optional` **features?**: `string`[]

---

### bestFor?

> `optional` **bestFor?**: `string`

---

### models?

> `optional` **models?**: `string`

---

### strengths?

> `optional` **strengths?**: `string`

---

### pricing?

> `optional` **pricing?**: `string`

---

### setupCommand?

> `optional` **setupCommand?**: `string`

---

### handler?

> `optional` **handler?**: (`argv`) => `Promise`\<`void`\>

#### Parameters

##### argv

###### check?

`boolean`

###### nonInteractive?

`boolean`

#### Returns

`Promise`\<`void`\>
