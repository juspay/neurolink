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

Defined in: [types/cli.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2029)

Strategy: "heuristic" (default) or "llm" (--classifier-strategy).

---

### classifierModelProvider?

> `optional` **classifierModelProvider?**: `string`

Defined in: [types/cli.ts:2031](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2031)

LLM-classifier provider override (--classifier-model-provider).

---

### classifierModelName?

> `optional` **classifierModelName?**: `string`

Defined in: [types/cli.ts:2033](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2033)

LLM-classifier model override (--classifier-model-name).

---

### classifierModelRegion?

> `optional` **classifierModelRegion?**: `string`

Defined in: [types/cli.ts:2035](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2035)

LLM-classifier region override (--classifier-model-region).

---

### classifierPool?

> `optional` **classifierPool?**: `string`

Defined in: [types/cli.ts:2041](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2041)

Path to a JSON file OR inline JSON array of pool members
(--classifier-pool). Each entry: { provider, model?, region?, description?,
tiers?, cost?, quality?, capabilities?, id? }.

---

### classifierTimeout?

> `optional` **classifierTimeout?**: `number`

Defined in: [types/cli.ts:2043](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2043)

LLM-classifier hard timeout in ms (--classifier-timeout).
