[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateCondensationPrompt

# Function: validateCondensationPrompt()

> **validateCondensationPrompt**(`prompt`): [`CondensationPromptValidation`](../type-aliases/CondensationPromptValidation.md)

Check a condensation prompt template for the placeholders Hippocampus
expects. Pure — never logs or throws. `valid` is false only when a
structural placeholder (`OLD_MEMORY` / `NEW_CONTENT`) is missing;
a missing `MAX_WORDS` is reported in `missing` but leaves `valid` true.

## Parameters

### prompt

`string`

## Returns

[`CondensationPromptValidation`](../type-aliases/CondensationPromptValidation.md)
