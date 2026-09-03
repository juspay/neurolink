[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2339](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2339)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2340)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2341)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2342)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
