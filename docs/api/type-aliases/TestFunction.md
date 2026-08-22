[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TestFunction

# Type Alias: TestFunction

> **TestFunction** = `object`

Defined in: [types/common.ts:277](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L277)

A named test function with an optional category.

## Properties

### name

> **name**: `string`

Defined in: [types/common.ts:279](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L279)

Display name of the test

---

### fn

> **fn**: () => `Promise`\<`boolean`\>

Defined in: [types/common.ts:281](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L281)

Async function that returns true on pass, false on fail

#### Returns

`Promise`\<`boolean`\>

---

### category?

> `optional` **category?**: `string`

Defined in: [types/common.ts:283](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L283)

Optional grouping category
