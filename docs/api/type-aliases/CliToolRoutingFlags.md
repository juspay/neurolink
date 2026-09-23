[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2018)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2020)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:2022](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2022)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2024)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:2026](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2026)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:2028](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2028)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:2033](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2033)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:2038](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2038)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
