[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextConverter

# Class: ContextConverter

Defined in: [types/context.ts:462](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L462)

## Constructors

### Constructor

> **new ContextConverter**(): `ContextConverter`

#### Returns

`ContextConverter`

## Methods

### convertBusinessContext()

> `static` **convertBusinessContext**(`legacyContext`, `domainType`, `options?`): [`ExecutionContext`](../type-aliases/ExecutionContext.md)

Defined in: [types/context.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L467)

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

Defined in: [types/context.ts:531](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L531)

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
