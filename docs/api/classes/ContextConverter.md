[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextConverter

# Class: ContextConverter

Defined in: [types/context.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L463)

## Constructors

### Constructor

> **new ContextConverter**(): `ContextConverter`

#### Returns

`ContextConverter`

## Methods

### convertBusinessContext()

> `static` **convertBusinessContext**(`legacyContext`, `domainType`, `options?`): [`ExecutionContext`](../type-aliases/ExecutionContext.md)

Defined in: [types/context.ts:468](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L468)

Convert legacy business context to generic domain context
Based on business context patterns

#### Parameters

##### legacyContext

`Record`\<`string`, `unknown`\>

##### domainType

`string`

##### options?

`ContextConversionOptions` = `{}`

#### Returns

[`ExecutionContext`](../type-aliases/ExecutionContext.md)

---

### createDomainContext()

> `static` **createDomainContext**(`domainType`, `domainData`, `sessionInfo?`): [`ExecutionContext`](../type-aliases/ExecutionContext.md)

Defined in: [types/context.ts:532](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L532)

Create execution context for required domain

#### Parameters

##### domainType

`string`

##### domainData

`Record`\<`string`, `unknown`\>

##### sessionInfo?

###### sessionId?

`string`

###### userId?

`string`

#### Returns

[`ExecutionContext`](../type-aliases/ExecutionContext.md)
