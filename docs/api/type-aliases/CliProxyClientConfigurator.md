[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientConfigurator

# Type Alias: CliProxyClientConfigurator

> **CliProxyClientConfigurator** = `object`

Defined in: [types/proxyClient.ts:10](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L10)

One AI coding CLI the proxy can point at itself.

Adding a CLI means adding one implementation of this type and one line in
`src/cli/proxy-clients/registry.ts`. Nothing else in the proxy should need
to know the client exists.

## Properties

### id

> **id**: `string`

Defined in: [types/proxyClient.ts:12](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L12)

Stable kebab-case identifier, e.g. "claude-code".

---

### displayName

> **displayName**: `string`

Defined in: [types/proxyClient.ts:14](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L14)

Human-readable name used in CLI output, e.g. "Claude Code".

---

### detect

> **detect**: () => `Promise`\<`boolean`\>

Defined in: [types/proxyClient.ts:19](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L19)

Whether this CLI appears to be installed. Configurators must not create
config files for a CLI the user never installed.

#### Returns

`Promise`\<`boolean`\>

---

### apply

> **apply**: (`proxyBaseUrl`) => `Promise`\<`boolean`\>

Defined in: [types/proxyClient.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L26)

Point the CLI at the proxy. `proxyBaseUrl` is the bare proxy origin
(e.g. "http://127.0.0.1:55669"); the configurator appends whatever path
suffix its CLI needs. Returns false when nothing was written, so callers
never print a success message for work that did not happen.

#### Parameters

##### proxyBaseUrl

`string`

#### Returns

`Promise`\<`boolean`\>

---

### restore

> **restore**: (`proxyBaseUrl`) => `Promise`\<`boolean`\>

Defined in: [types/proxyClient.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L32)

Restore the user's previous configuration. `proxyBaseUrl` is the same bare
origin; a configurator that finds a different URL configured must leave it
alone and return false.

#### Parameters

##### proxyBaseUrl

`string`

#### Returns

`Promise`\<`boolean`\>
