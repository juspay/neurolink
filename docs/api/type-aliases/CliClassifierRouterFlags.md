[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2025)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2027](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2027)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2033](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2033)

Strategy: "auto" (default), "heuristic", "llm" or "jev"
(--classifier-strategy). "auto" resolves to "jev" when TYPESAFE_API_KEY
is set and "heuristic" otherwise.

---

### classifierMinUpgradeConfidence?

> `optional` **classifierMinUpgradeConfidence?**: `number`

Defined in: [types/cli.ts:2039](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2039)

Minimum confidence required to route UP to a costlier model
(--classifier-min-upgrade-confidence). Only meaningful for "jev", whose
confidence is calibrated. Default: 0.3.

---

### classifierMinDowngradeConfidence?

> `optional` **classifierMinDowngradeConfidence?**: `number`

Defined in: [types/cli.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2045)

Minimum confidence required to route DOWN to a cheaper model
(--classifier-min-downgrade-confidence). Higher than the upgrade bar
because the mistakes cost differently. Default: 0.6.

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2047)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2049)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2051)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2057](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2057)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2059)

LLM-classifier hard timeout in ms (--classifier-timeout).
