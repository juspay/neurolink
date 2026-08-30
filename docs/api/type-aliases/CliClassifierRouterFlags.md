[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2003)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2005](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2005)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2007](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2007)

Strategy: "heuristic" (default) or "llm" (--classifier-strategy).

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2009](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2009)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2011)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2013](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2013)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2019](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2019)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2021](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2021)

LLM-classifier hard timeout in ms (--classifier-timeout).
