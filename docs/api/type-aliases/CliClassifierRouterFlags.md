[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliClassifierRouterFlags

# Type Alias: CliClassifierRouterFlags

> **CliClassifierRouterFlags** = `object`

Defined in: [types/cli.ts:2022](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2022)

CLI flags for the classifier router (`--classifier-*`). Builds a
ClassifierRouterConfig that is injected at SDK construction time.

## Properties

### classifierRouter?

> `optional` **classifierRouter?**: `boolean`

Defined in: [types/cli.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2024)

Master enable switch (--classifier-router).

---

### classifierStrategy?

> `optional` **classifierStrategy?**: `string`

Defined in: [types/cli.ts:2026](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2026)

Strategy: "heuristic" (default) or "llm" (--classifier-strategy).

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2028](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2028)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2030](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2030)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2032](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2032)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2038](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2038)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2040](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2040)

LLM-classifier hard timeout in ms (--classifier-timeout).
