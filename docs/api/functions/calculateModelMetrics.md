[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateModelMetrics

# Function: calculateModelMetrics()

> **calculateModelMetrics**(`responses`): `Record`\<`string`, \{ `successRate`: `number`; `avgResponseTime`: `number`; \}\>

Defined in: [workflow/utils/workflowMetrics.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/utils/workflowMetrics.ts#L160)

Calculate model-specific metrics from ensemble responses

## Parameters

### responses

[`EnsembleResponse`](../type-aliases/EnsembleResponse.md)[]

## Returns

`Record`\<`string`, \{ `successRate`: `number`; `avgResponseTime`: `number`; \}\>
