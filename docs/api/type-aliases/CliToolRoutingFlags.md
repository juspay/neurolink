[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:2035](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2035)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:2037](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2037)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:2039](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2039)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:2041](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2041)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:2043](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2043)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2045)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:2050](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2050)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2055)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
