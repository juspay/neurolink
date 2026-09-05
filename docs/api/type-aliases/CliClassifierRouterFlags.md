[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2007](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2007)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2009](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2009)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2011)

Strategy: "heuristic" (default) or "llm" (--classifier-strategy).

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2013](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2013)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2015)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2017](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2017)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2023](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2023)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2025)

LLM-classifier hard timeout in ms (--classifier-timeout).
