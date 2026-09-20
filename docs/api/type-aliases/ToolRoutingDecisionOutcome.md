[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingDecisionOutcome

# Type Alias: ToolRoutingDecisionOutcome

> **ToolRoutingDecisionOutcome** = `object`

Defined in: [types/toolRouting.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L469)

What the decision-model tool router concluded. Distinct from
[ToolRoutingDecision](ToolRoutingDecision.md), which is the telemetry record for a routing
turn regardless of which strategy produced it.

## Properties

### selectedServerIds

> **selectedServerIds**: `string`[]

Defined in: [types/toolRouting.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L471)

Servers whose tools stay available.

---

### excludedServerIds

> **excludedServerIds**: `string`[]

Defined in: [types/toolRouting.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L473)

Servers the model confidently ruled out.

---

### excludedToolNames

> **excludedToolNames**: `string`[]

Defined in: [types/toolRouting.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L475)

Flattened tool names to add to the request denylist.

---

### answeredCount

> **answeredCount**: `number`

Defined in: [types/toolRouting.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L477)

How many servers came back with a usable, confident answer.

---

### model

> **model**: `string`

Defined in: [types/toolRouting.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L479)

Resolved decision model id, for telemetry.

---

### latencyMs

> **latencyMs**: `number`

Defined in: [types/toolRouting.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L481)

Round trip in milliseconds.
