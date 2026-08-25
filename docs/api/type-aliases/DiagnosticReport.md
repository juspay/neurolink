[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2307)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2308](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2308)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2309)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2310)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
