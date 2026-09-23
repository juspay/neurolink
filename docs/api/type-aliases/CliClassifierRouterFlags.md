[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2045)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2047)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2053)

Strategy: "auto" (default), "heuristic", "llm" or "jev"
(--classifier-strategy). "auto" resolves to "jev" when TYPESAFE_API_KEY
is set and "heuristic" otherwise.

---

### classifierMinUpgradeConfidence?

> `optional` **classifierMinUpgradeConfidence?**: `number`

Defined in: [types/cli.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2059)

Minimum confidence required to route UP to a costlier model
(--classifier-min-upgrade-confidence). Only meaningful for "jev", whose
confidence is calibrated. Default: 0.3.

---

### classifierMinDowngradeConfidence?

> `optional` **classifierMinDowngradeConfidence?**: `number`

Defined in: [types/cli.ts:2065](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2065)

Minimum confidence required to route DOWN to a cheaper model
(--classifier-min-downgrade-confidence). Higher than the upgrade bar
because the mistakes cost differently. Default: 0.6.

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2067)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2069)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2071)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2077)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2079](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2079)

LLM-classifier hard timeout in ms (--classifier-timeout).
