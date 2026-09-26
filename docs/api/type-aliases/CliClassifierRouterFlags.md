[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2070)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2072](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2072)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2079](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2079)

Strategy: "auto" (default), "heuristic", "llm" or "jev"
(--classifier-strategy). "auto" resolves to "jev" when a decision
provider is configured (TYPESAFE_API_KEY, or LAYA_API_KEY with
LAYA_BASE_URL) and "heuristic" otherwise.

---

### classifierMinUpgradeConfidence?

> `optional` **classifierMinUpgradeConfidence?**: `number`

Defined in: [types/cli.ts:2085](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2085)

Minimum confidence required to route UP to a costlier model
(--classifier-min-upgrade-confidence). Only meaningful for "jev", whose
confidence is calibrated. Default: 0.3.

---

### classifierMinDowngradeConfidence?

> `optional` **classifierMinDowngradeConfidence?**: `number`

Defined in: [types/cli.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2091)

Minimum confidence required to route DOWN to a cheaper model
(--classifier-min-downgrade-confidence). Higher than the upgrade bar
because the mistakes cost differently. Default: 0.6.

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2093)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2095)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2097](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2097)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2103)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2105)

LLM-classifier hard timeout in ms (--classifier-timeout).
