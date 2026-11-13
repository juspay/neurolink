[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildMechanicalDigest

# Function: buildMechanicalDigest()

> **buildMechanicalDigest**(`records`): `object`

Mechanical digest of a run's execution records: which tools ran, ok/failed
counts, and bounded excerpts of successful payloads. The delivery
guarantee's last line of defense — a non-empty execution record can never
produce an empty result.

## Parameters

### records

[`ToolExecutionRecord`](../type-aliases/ToolExecutionRecord.md)[]

## Returns

`object`

### kind

> **kind**: `"mechanical-digest"`

### toolsRun

> **toolsRun**: `Record`\<`string`, \{ `calls`: `number`; `ok`: `number`; `failed`: `number`; \}\>

### excerpts

> **excerpts**: `object`[]
