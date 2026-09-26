[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliToolRoutingFlags

# Type Alias: CliToolRoutingFlags

> **CliToolRoutingFlags** = `object`

Raw CLI flag shape for the tool-routing family of options.
Keys are camelCase as yargs delivers them after parsing kebab-case aliases.

## Properties

### toolRouting?

> `optional` **toolRouting?**: `boolean`

Master enable switch (--tool-routing).

---

### toolRoutingTimeout?

> `optional` **toolRoutingTimeout?**: `number`

Router LLM hard timeout in ms (--tool-routing-timeout).

---

### toolRoutingRouterProvider?

> `optional` **toolRoutingRouterProvider?**: `string`

Router LLM provider override (--tool-routing-router-provider).

---

### toolRoutingRouterModel?

> `optional` **toolRoutingRouterModel?**: `string`

Router LLM model override (--tool-routing-router-model).

---

### toolRoutingRouterRegion?

> `optional` **toolRoutingRouterRegion?**: `string`

Router LLM region override (--tool-routing-router-region).

---

### toolRoutingAlwaysInclude?

> `optional` **toolRoutingAlwaysInclude?**: `string`[]

Server ids that are always kept and never offered to the router
(--tool-routing-always-include, repeatable).

---

### toolRoutingServers?

> `optional` **toolRoutingServers?**: `string`

Path to a JSON file OR inline JSON array of server descriptors
(--tool-routing-servers).
