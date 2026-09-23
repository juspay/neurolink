[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2062)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2064](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2064)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2070)

Strategy: "auto" (default), "heuristic", "llm" or "jev"
(--classifier-strategy). "auto" resolves to "jev" when TYPESAFE_API_KEY
is set and "heuristic" otherwise.

---

### classifierMinUpgradeConfidence?

> `optional` **classifierMinUpgradeConfidence?**: `number`

Defined in: [types/cli.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2076)

Minimum confidence required to route UP to a costlier model
(--classifier-min-upgrade-confidence). Only meaningful for "jev", whose
confidence is calibrated. Default: 0.3.

---

### classifierMinDowngradeConfidence?

> `optional` **classifierMinDowngradeConfidence?**: `number`

Defined in: [types/cli.ts:2082](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2082)

Minimum confidence required to route DOWN to a cheaper model
(--classifier-min-downgrade-confidence). Higher than the upgrade bar
because the mistakes cost differently. Default: 0.6.

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2084](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2084)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2086](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2086)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2088](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2088)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2094)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2096)

LLM-classifier hard timeout in ms (--classifier-timeout).
