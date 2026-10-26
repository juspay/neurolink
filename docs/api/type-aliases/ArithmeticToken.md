[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArithmeticToken

# Type Alias: ArithmeticToken

> **ArithmeticToken** = \{ `kind`: `"number"`; `value`: `number`; `at`: `number`; \} \| \{ `kind`: `"identifier"`; `name`: `string`; `at`: `number`; \} \| \{ `kind`: `"operator"`; `value`: `"+"` \| `"-"` \| `"*"` \| `"/"` \| `"%"` \| `"**"`; `at`: `number`; \} \| \{ `kind`: `"paren"`; `value`: `"("` \| `")"`; `at`: `number`; \} \| \{ `kind`: `"comma"`; `at`: `number`; \} \| \{ `kind`: `"end"`; `at`: `number`; \}

One lexical token of a `calculateMath` expression (`at` is its offset).
