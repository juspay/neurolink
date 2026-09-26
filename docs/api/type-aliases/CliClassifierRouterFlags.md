[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Strategy: "auto" (default), "heuristic", "llm" or "jev"
(--classifier-strategy). "auto" resolves to "jev" when a decision
provider is configured (TYPESAFE_API_KEY, or LAYA_API_KEY with
LAYA_BASE_URL) and "heuristic" otherwise.

---

### classifierMinUpgradeConfidence?

> `optional` **classifierMinUpgradeConfidence?**: `number`

Minimum confidence required to route UP to a costlier model
(--classifier-min-upgrade-confidence). Only meaningful for "jev", whose
confidence is calibrated. Default: 0.3.

---

### classifierMinDowngradeConfidence?

> `optional` **classifierMinDowngradeConfidence?**: `number`

Minimum confidence required to route DOWN to a cheaper model
(--classifier-min-downgrade-confidence). Higher than the upgrade bar
because the mistakes cost differently. Default: 0.6.

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

LLM-classifier hard timeout in ms (--classifier-timeout).
