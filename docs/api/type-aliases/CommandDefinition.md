[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandDefinition

# Type Alias: CommandDefinition\<TArgs\>

> **CommandDefinition**\<`TArgs`\> = `object`

Defined in: [types/cli.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L500)

Command definition

## Type Parameters

### TArgs

`TArgs` = [`BaseCommandArgs`](BaseCommandArgs.md)

## Properties

### name

> **name**: `string`

Defined in: [types/cli.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L501)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L502)

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/cli.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L503)

---

### args?

> `optional` **args?**: \{ \[K in keyof TArgs\]: \{ type: "string" \| "number" \| "boolean"; description: string; required?: boolean; default?: TArgs\[K\] \} \}

Defined in: [types/cli.ts:504](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L504)

---

### handler

> **handler**: [`CommandHandler`](CommandHandler.md)\<`TArgs`\>

Defined in: [types/cli.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L512)
