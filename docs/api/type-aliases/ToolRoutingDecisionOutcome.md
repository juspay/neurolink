[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingDecisionOutcome

# Type Alias: ToolRoutingDecisionOutcome

> **ToolRoutingDecisionOutcome** = `object`

What the decision-model tool router concluded. Distinct from
[ToolRoutingDecision](ToolRoutingDecision.md), which is the telemetry record for a routing
turn regardless of which strategy produced it.

## Properties

### selectedServerIds

> **selectedServerIds**: `string`[]

Servers whose tools stay available.

---

### excludedServerIds

> **excludedServerIds**: `string`[]

Servers the model confidently ruled out.

---

### excludedToolNames

> **excludedToolNames**: `string`[]

Flattened tool names to add to the request denylist.

---

### answeredCount

> **answeredCount**: `number`

How many servers came back with a usable, confident answer.

---

### model

> **model**: `string`

Resolved decision model id, for telemetry.

---

### latencyMs

> **latencyMs**: `number`

Round trip in milliseconds.
