[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderInfo

# Type Alias: ProviderInfo

> **ProviderInfo** = `object`

Defined in: [types/cli.ts:697](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L697)

Provider information for setup display

## Properties

### id

> **id**: `string`

Defined in: [types/cli.ts:698](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L698)

---

### name

> **name**: `string`

Defined in: [types/cli.ts:699](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L699)

---

### emoji

> **emoji**: `string`

Defined in: [types/cli.ts:700](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L700)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:701](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L701)

---

### setupTime

> **setupTime**: `string`

Defined in: [types/cli.ts:702](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L702)

---

### cost

> **cost**: `string`

Defined in: [types/cli.ts:703](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L703)

---

### difficulty?

> `optional` **difficulty?**: `"Easy"` \| `"Medium"` \| `"Hard"`

Defined in: [types/cli.ts:704](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L704)

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/cli.ts:705](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L705)

---

### bestFor?

> `optional` **bestFor?**: `string`

Defined in: [types/cli.ts:706](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L706)

---

### models?

> `optional` **models?**: `string`

Defined in: [types/cli.ts:707](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L707)

---

### strengths?

> `optional` **strengths?**: `string`

Defined in: [types/cli.ts:708](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L708)

---

### pricing?

> `optional` **pricing?**: `string`

Defined in: [types/cli.ts:709](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L709)

---

### setupCommand?

> `optional` **setupCommand?**: `string`

Defined in: [types/cli.ts:710](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L710)

---

### handler?

> `optional` **handler?**: (`argv`) => `Promise`\<`void`\>

Defined in: [types/cli.ts:711](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L711)

#### Parameters

##### argv

###### check?

`boolean`

###### nonInteractive?

`boolean`

#### Returns

`Promise`\<`void`\>
