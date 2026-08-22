[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / normalizeAndValidate

# Function: normalizeAndValidate()

> **normalizeAndValidate**(`sources`, `options`): `Promise`\<`KnowledgeNormalizeResult`\>

Defined in: [knowledge/resolve.ts:105](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/knowledge/resolve.ts#L105)

Resolve and validate every source into normalized entries. `validation.ok`
is false when any error-level issue was found; the caller (index builder)
must not swap in an index built from an invalid set. Async so the public
contract is stable if a future source kind needs asynchronous loading.

## Parameters

### sources

[`KnowledgeSource`](../type-aliases/KnowledgeSource.md)[]

### options

`KnowledgeNormalizeOptions`

## Returns

`Promise`\<`KnowledgeNormalizeResult`\>
