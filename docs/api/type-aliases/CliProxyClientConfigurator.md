[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientConfigurator

# Type Alias: CliProxyClientConfigurator

> **CliProxyClientConfigurator** = `object`

One AI coding CLI the proxy can point at itself.

Adding a CLI means adding one implementation of this type and one line in
`src/cli/proxy-clients/registry.ts`. Nothing else in the proxy should need
to know the client exists.

## Properties

### id

> **id**: `string`

Stable kebab-case identifier, e.g. "claude-code".

---

### displayName

> **displayName**: `string`

Human-readable name used in CLI output, e.g. "Claude Code".

---

### detect

> **detect**: () => `Promise`\<`boolean`\>

Whether this CLI appears to be installed. Configurators must not create
config files for a CLI the user never installed.

#### Returns

`Promise`\<`boolean`\>

---

### apply

> **apply**: (`proxyBaseUrl`, `options?`) => `Promise`\<`boolean`\>

Point the CLI at the proxy. `proxyBaseUrl` is the bare proxy origin
(e.g. "http://127.0.0.1:55669"); the configurator appends whatever path
suffix its CLI needs. Returns false when nothing was written, so callers
never print a success message for work that did not happen.

#### Parameters

##### proxyBaseUrl

`string`

##### options?

[`CliProxyClientApplyOptions`](CliProxyClientApplyOptions.md)

#### Returns

`Promise`\<`boolean`\>

---

### restore

> **restore**: (`proxyBaseUrl`) => `Promise`\<`boolean`\>

Restore the user's previous configuration. `proxyBaseUrl` is the same bare
origin; a configurator that finds a different URL configured must leave it
alone and return false.

#### Parameters

##### proxyBaseUrl

`string`

#### Returns

`Promise`\<`boolean`\>

---

### postApplyNote?

> `optional` **postApplyNote?**: (`proxyBaseUrl`) => `Promise`\<`string` \| `null`\>

Something the user must still do for apply() to take effect.

Writing a file is not the same as being in effect. Copilot reads its
provider settings from the environment only, so its configurator writes a
script the user has to source; until they do, the proxy reports a green
check for a file nothing reads. Returning a string here lets a client say
"written, but not yet live, and here is the one line that fixes it".
Return null when nothing is outstanding.

#### Parameters

##### proxyBaseUrl

`string`

#### Returns

`Promise`\<`string` \| `null`\>
