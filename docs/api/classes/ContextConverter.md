[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextConverter

# Class: ContextConverter

## Constructors

### Constructor

> **new ContextConverter**(): `ContextConverter`

#### Returns

`ContextConverter`

## Methods

### convertBusinessContext()

> `static` **convertBusinessContext**(`legacyContext`, `domainType`, `options?`): [`ExecutionContext`](../type-aliases/ExecutionContext.md)

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
