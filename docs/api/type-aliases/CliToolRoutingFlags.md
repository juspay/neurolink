[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:2000](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2000)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:2002](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2002)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2004)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2006)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:2008](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2008)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2010)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2015)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2020)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
