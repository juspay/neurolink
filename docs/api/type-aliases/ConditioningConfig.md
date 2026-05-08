[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConditioningConfig

# Type Alias: ConditioningConfig

> **ConditioningConfig** = `object`

Defined in: [types/workflow.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L159)

Response conditioning configuration
NOTE: Testing phase - stub only, no actual conditioning

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/workflow.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L161)

---

### useConfidence

> **useConfidence**: `boolean`

Defined in: [types/workflow.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L162)

---

### confidenceThresholds?

> `optional` **confidenceThresholds?**: `object`

Defined in: [types/workflow.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L163)

#### high

> **high**: `number`

#### medium

> **medium**: `number`

#### low

> **low**: `number`

---

### synthesisModel?

> `optional` **synthesisModel?**: `object`

Defined in: [types/workflow.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L170)

#### provider

> **provider**: `string`

#### model

> **model**: `string`

#### temperature?

> `optional` **temperature?**: `number`

---

### toneAdjustment?

> `optional` **toneAdjustment?**: [`ToneAdjustment`](ToneAdjustment.md)

Defined in: [types/workflow.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L177)

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/workflow.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L180)

---

### metadataFields?

> `optional` **metadataFields?**: `string`[]

Defined in: [types/workflow.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L181)

---

### addConfidenceStatement?

> `optional` **addConfidenceStatement?**: `boolean`

Defined in: [types/workflow.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L184)

---

### addModelAttribution?

> `optional` **addModelAttribution?**: `boolean`

Defined in: [types/workflow.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L185)

---

### addExecutionTime?

> `optional` **addExecutionTime?**: `boolean`

Defined in: [types/workflow.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L186)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L189)
