[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandDefinition

# Type Alias: CommandDefinition\<TArgs\>

> **CommandDefinition**\<`TArgs`\> = `object`

Defined in: [types/cli.ts:474](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L474)

Command definition

## Type Parameters

### TArgs

`TArgs` = [`BaseCommandArgs`](BaseCommandArgs.md)

## Properties

### name

> **name**: `string`

Defined in: [types/cli.ts:475](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L475)

---

### description

> **description**: `string`

Defined in: [types/cli.ts:476](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L476)

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/cli.ts:477](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L477)

---

### args?

> `optional` **args?**: \{ \[K in keyof TArgs\]: \{ type: "string" \| "number" \| "boolean"; description: string; required?: boolean; default?: TArgs\[K\] \} \}

Defined in: [types/cli.ts:478](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L478)

---

### handler

> **handler**: [`CommandHandler`](CommandHandler.md)\<`TArgs`\>

Defined in: [types/cli.ts:486](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L486)
