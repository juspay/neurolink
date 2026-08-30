[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1976)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1978)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1980)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1982)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:1984](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1984)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1986)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:1991](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1991)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:1996](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1996)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
