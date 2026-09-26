[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2436)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2437)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2438)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2439)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
