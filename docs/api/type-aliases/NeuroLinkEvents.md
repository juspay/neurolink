[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkEvents

# Type Alias: NeuroLinkEvents

> **NeuroLinkEvents** = `object`

Enhanced NeuroLink event types
Flexible type to support both typed and legacy event patterns

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### tool:start

> **tool:start**: `unknown`

---

### tool:end

> **tool:end**: `unknown`

---

### stream:start

> **stream:start**: `unknown`

---

### stream:end

> **stream:end**: `unknown`

---

### stream:chunk

> **stream:chunk**: `unknown`

---

### stream:complete

> **stream:complete**: `unknown`

---

### stream:error

> **stream:error**: `unknown`

---

### generation:start

> **generation:start**: `unknown`

---

### generation:end

> **generation:end**: `unknown`

---

### response:start

> **response:start**: `unknown`

---

### response:end

> **response:end**: `unknown`

---

### externalMCP:serverConnected

> **externalMCP:serverConnected**: `unknown`

---

### externalMCP:serverDisconnected

> **externalMCP:serverDisconnected**: `unknown`

---

### externalMCP:serverFailed

> **externalMCP:serverFailed**: `unknown`

---

### externalMCP:toolDiscovered

> **externalMCP:toolDiscovered**: `unknown`

---

### externalMCP:toolRemoved

> **externalMCP:toolRemoved**: `unknown`

---

### externalMCP:serverAdded

> **externalMCP:serverAdded**: `unknown`

---

### externalMCP:serverRemoved

> **externalMCP:serverRemoved**: `unknown`

---

### tools-register:start

> **tools-register:start**: `unknown`

---

### tools-register:end

> **tools-register:end**: `unknown`

---

### connected

> **connected**: `unknown`

---

### message

> **message**: `unknown`

---

### error

> **error**: `unknown`

---

### log

> **log**: `unknown`

---

### log-event

> **log-event**: `unknown`

---

### autoresearch:initialized

> **autoresearch:initialized**: [`AutoresearchInitializedEvent`](AutoresearchInitializedEvent.md)

---

### autoresearch:resumed

> **autoresearch:resumed**: [`AutoresearchResumedEvent`](AutoresearchResumedEvent.md)

---

### autoresearch:phase-changed

> **autoresearch:phase-changed**: [`AutoresearchPhaseChangedEvent`](AutoresearchPhaseChangedEvent.md)

---

### autoresearch:experiment-started

> **autoresearch:experiment-started**: [`AutoresearchExperimentStartedEvent`](AutoresearchExperimentStartedEvent.md)

---

### autoresearch:experiment-completed

> **autoresearch:experiment-completed**: [`AutoresearchExperimentCompletedEvent`](AutoresearchExperimentCompletedEvent.md)

---

### autoresearch:metric-improved

> **autoresearch:metric-improved**: [`AutoresearchMetricImprovedEvent`](AutoresearchMetricImprovedEvent.md)

---

### autoresearch:revert

> **autoresearch:revert**: [`AutoresearchRevertEvent`](AutoresearchRevertEvent.md)

---

### autoresearch:revert-failed

> **autoresearch:revert-failed**: [`AutoresearchRevertFailedEvent`](AutoresearchRevertFailedEvent.md)

---

### autoresearch:state-updated

> **autoresearch:state-updated**: [`AutoresearchStateUpdatedEvent`](AutoresearchStateUpdatedEvent.md)

---

### autoresearch:error

> **autoresearch:error**: [`AutoresearchErrorEvent`](AutoresearchErrorEvent.md)
