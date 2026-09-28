[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CondensationPromptValidation

# Type Alias: CondensationPromptValidation

> **CondensationPromptValidation** = `object`

Result of `validateCondensationPrompt()`. `missing` lists every absent
placeholder; `fatal` is the subset whose absence breaks memory
(`OLD_MEMORY`: each turn overwrites the summary; `NEW_CONTENT`: memory
never grows). A missing `MAX_WORDS` only loses the word cap.

## Properties

### valid

> **valid**: `boolean`

---

### missing

> **missing**: [`CondensationPlaceholder`](CondensationPlaceholder.md)[]

---

### fatal

> **fatal**: [`CondensationPlaceholder`](CondensationPlaceholder.md)[]
