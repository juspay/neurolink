[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:1998](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1998)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:2000](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2000)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:2002](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2002)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2004)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2006)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:2008](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2008)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:2013](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2013)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2018)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
