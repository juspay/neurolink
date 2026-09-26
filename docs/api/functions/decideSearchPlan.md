[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / decideSearchPlan

# Function: decideSearchPlan()

> **decideSearchPlan**(`query`, `decide`, `capabilities`): `Promise`\<[`SearchPlanResult`](../type-aliases/SearchPlanResult.md) \| `null`\>

Ask how this particular query should be retrieved.

Returns `null` when nothing should change — no decision provider, a failed
call, or an answer set that suggests nothing. Every returned field is
optional and means "use this unless the caller said otherwise".

## Parameters

### query

`string`

### decide

[`DecisionCallerFn`](../type-aliases/DecisionCallerFn.md)

### capabilities

[`SearchPlanCapabilities`](../type-aliases/SearchPlanCapabilities.md)

## Returns

`Promise`\<[`SearchPlanResult`](../type-aliases/SearchPlanResult.md) \| `null`\>
