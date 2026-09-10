[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2010)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2012](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2012)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2014](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2014)

Strategy: "heuristic" (default) or "llm" (--classifier-strategy).

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2016](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2016)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2018)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2020)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2026](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2026)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2028](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2028)

LLM-classifier hard timeout in ms (--classifier-timeout).
