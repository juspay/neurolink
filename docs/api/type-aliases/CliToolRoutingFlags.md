[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Defined in: [types/cli.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1934)

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Defined in: [types/cli.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1936)

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Defined in: [types/cli.ts:1938](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1938)

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Defined in: [types/cli.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1940)

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Defined in: [types/cli.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1942)

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Defined in: [types/cli.ts:1944](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1944)

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Defined in: [types/cli.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1949)

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Defined in: [types/cli.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1954)

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
