[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TestFunction

# Type Alias: TestFunction

> **TestFunction** = `object`

A named test function with an optional category.

## Properties

### name

> **name**: `string`

Display name of the test

---

### fn

> **fn**: () => `Promise`\<`boolean`\>

Async function that returns true on pass, false on fail

#### Returns

`Promise`\<`boolean`\>

---

### category?

> `optional` **category?**: `string`

Optional grouping category
