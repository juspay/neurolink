[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateModelMetrics

# Function: calculateModelMetrics()

> **calculateModelMetrics**(`responses`): `Record`\<`string`, \{ `successRate`: `number`; `avgResponseTime`: `number`; \}\>

Defined in: [workflow/utils/workflowMetrics.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/workflow/utils/workflowMetrics.ts#L160)

Calculate model-specific metrics from ensemble responses

## Parameters

### responses

[`EnsembleResponse`](../type-aliases/EnsembleResponse.md)[]

## Returns

`Record`\<`string`, \{ `successRate`: `number`; `avgResponseTime`: `number`; \}\>
