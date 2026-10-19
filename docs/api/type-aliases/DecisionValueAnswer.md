[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionValueAnswer

# Type Alias: DecisionValueAnswer

> **DecisionValueAnswer** = `object`

## Properties

### type

> **type**: `"value"`

---

### value

> **value**: `string` \| `number` \| `null`

The extracted value: a number for `int` / `float`, else a string. Null when the model abstained.

---

### confidence

> **confidence**: `number`

---

### unknown?

> `optional` **unknown?**: `boolean`

True when the model found nothing to extract; `value` is then null.
