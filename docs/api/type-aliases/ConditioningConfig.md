[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConditioningConfig

# Type Alias: ConditioningConfig

> **ConditioningConfig** = `object`

Response conditioning configuration
NOTE: Testing phase - stub only, no actual conditioning

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### useConfidence

> **useConfidence**: `boolean`

---

### confidenceThresholds?

> `optional` **confidenceThresholds?**: `object`

#### high

> **high**: `number`

#### medium

> **medium**: `number`

#### low

> **low**: `number`

---

### synthesisModel?

> `optional` **synthesisModel?**: `object`

#### provider

> **provider**: `string`

#### model

> **model**: `string`

#### temperature?

> `optional` **temperature?**: `number`

---

### toneAdjustment?

> `optional` **toneAdjustment?**: [`ToneAdjustment`](ToneAdjustment.md)

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

---

### metadataFields?

> `optional` **metadataFields?**: `string`[]

---

### addConfidenceStatement?

> `optional` **addConfidenceStatement?**: `boolean`

---

### addModelAttribution?

> `optional` **addModelAttribution?**: `boolean`

---

### addExecutionTime?

> `optional` **addExecutionTime?**: `boolean`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>
