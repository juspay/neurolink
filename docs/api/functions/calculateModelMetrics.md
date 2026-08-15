[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateModelMetrics

# Function: calculateModelMetrics()

> **calculateModelMetrics**(`responses`): `Record`\<`string`, \{ `successRate`: `number`; `avgResponseTime`: `number`; \}\>

Defined in: [workflow/utils/workflowMetrics.ts:160](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/workflow/utils/workflowMetrics.ts#L160)

Calculate model-specific metrics from ensemble responses

## Parameters

### responses

[`EnsembleResponse`](../type-aliases/EnsembleResponse.md)[]

## Returns

`Record`\<`string`, \{ `successRate`: `number`; `avgResponseTime`: `number`; \}\>
