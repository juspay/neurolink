[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandDefinition

# Type Alias: CommandDefinition\<TArgs\>

> **CommandDefinition**\<`TArgs`\> = `object`

Command definition

## Type Parameters

### TArgs

`TArgs` = [`BaseCommandArgs`](BaseCommandArgs.md)

## Properties

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### aliases?

> `optional` **aliases?**: `string`[]

---

### args?

> `optional` **args?**: \{ \[K in keyof TArgs\]: \{ type: "string" \| "number" \| "boolean"; description: string; required?: boolean; default?: TArgs\[K\] \} \}

---

### handler

> **handler**: [`CommandHandler`](CommandHandler.md)\<`TArgs`\>
