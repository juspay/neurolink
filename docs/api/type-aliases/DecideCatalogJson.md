[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideCatalogJson

# Type Alias: DecideCatalogJson

> **DecideCatalogJson** = `object`

## Properties

### $schema?

> `optional` **$schema?**: `string`

---

### id

> **id**: `string`

---

### displayName

> **displayName**: `string`

---

### enumTypeName?

> `optional` **enumTypeName?**: `string`

---

### credentialsKey?

> `optional` **credentialsKey?**: `string`

---

### aliases

> **aliases**: `string`[]

---

### inferenceKinds

> **inferenceKinds**: readonly \[`"decide"`\]

---

### tier?

> `optional` **tier?**: `2`

---

### wire

> **wire**: [`CatalogWire`](CatalogWire.md)

---

### models

> **models**: `object`

#### default

> **default**: `string`

#### catalog

> **catalog**: `Record`\<`string`, [`CatalogModelSpec`](CatalogModelSpec.md)\>

#### topModels?

> `optional` **topModels?**: `string`[]

#### testModel?

> `optional` **testModel?**: `string`

---

### timeouts?

> `optional` **timeouts?**: `object`

#### decideMs?

> `optional` **decideMs?**: `number`

#### decideMsPerKStateTokens?

> `optional` **decideMsPerKStateTokens?**: `number`

Added to `decideMs` per 1,000 estimated state tokens, for a model whose latency grows with the state.

---

### decisionLimits?

> `optional` **decisionLimits?**: [`DecisionLimits`](DecisionLimits.md)

---

### decide

> **decide**: [`DecideBlock`](DecideBlock.md)

---

### setup

> **setup**: [`CatalogSetup`](CatalogSetup.md)

---

### evidence

> **evidence**: [`CatalogEvidence`](CatalogEvidence.md)
