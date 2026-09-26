[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoresearchEventMap

# Type Alias: AutoresearchEventMap

> **AutoresearchEventMap** = `object`

Union map of all autoresearch event names to their payload types.
Used by TypedEventEmitter consumers for documentation;
NeuroLinkEvents uses `unknown` payloads for flexibility.

## Properties

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
