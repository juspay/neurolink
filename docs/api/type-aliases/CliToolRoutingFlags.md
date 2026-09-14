[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:1995](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1995)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:1997](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1997)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:1999](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1999)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:2001](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2001)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2003)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:2005](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2005)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2010)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2015)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
