[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandDefinition

# Type Alias: CommandDefinition\<TArgs\>

> **CommandDefinition**\<`TArgs`\> = `object`

Defined in: [types/cli.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L494)

Command definition

## Type Parameters

### TArgs

`TArgs` = [`BaseCommandArgs`](BaseCommandArgs.md)

## Properties

### name

> **name**: `string`

Defined in: [types/cli.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L495)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L496)

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/cli.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L497)

---

### args?

> `optional` **args?**: \{ \[K in keyof TArgs\]: \{ type: "string" \| "number" \| "boolean"; description: string; required?: boolean; default?: TArgs\[K\] \} \}

Defined in: [types/cli.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L498)

---

### handler

> **handler**: [`CommandHandler`](CommandHandler.md)\<`TArgs`\>

Defined in: [types/cli.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L506)
