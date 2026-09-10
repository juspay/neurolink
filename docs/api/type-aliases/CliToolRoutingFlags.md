[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:1983](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1983)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:1985](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1985)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:1987](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1987)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:1989](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1989)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:1991](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1991)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:1993](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1993)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:1998](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1998)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2003)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
