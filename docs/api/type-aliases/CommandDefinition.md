[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandDefinition

# Type Alias: CommandDefinition\<TArgs\>

> **CommandDefinition**\<`TArgs`\> = `object`

Defined in: [types/cli.ts:492](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L492)

Command definition

## Type Parameters

### TArgs

`TArgs` = [`BaseCommandArgs`](BaseCommandArgs.md)

## Properties

### name

> **name**: `string`

Defined in: [types/cli.ts:493](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L493)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:494](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L494)

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/cli.ts:495](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L495)

---

### args?

> `optional` **args?**: \{ \[K in keyof TArgs\]: \{ type: "string" \| "number" \| "boolean"; description: string; required?: boolean; default?: TArgs\[K\] \} \}

Defined in: [types/cli.ts:496](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L496)

---

### handler

> **handler**: [`CommandHandler`](CommandHandler.md)\<`TArgs`\>

Defined in: [types/cli.ts:504](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L504)
