[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecuteRequest

# Type Alias: ToolExecuteRequest

> **ToolExecuteRequest** = `object`

Defined in: [types/server.ts:696](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L696)

Tool execution request

## Properties

### name

> **name**: `string`

Defined in: [types/server.ts:698](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L698)

Tool name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/server.ts:701](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L701)

Tool arguments

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/server.ts:704](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L704)

Session context

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/server.ts:707](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L707)

User context
