[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateRoutesOptions

# Type Alias: CreateRoutesOptions

> **CreateRoutesOptions** = `object`

Options for createAllRoutes / createRoutes.

## Properties

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

---

### getRoutes?

> `optional` **getRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]

---

### proxy?

> `optional` **proxy?**: `boolean`

Enable every proxy door: Claude, OpenAI, Codex and Gemini.

---

### claudeProxy?

> `optional` **claudeProxy?**: `boolean`

---

### openaiProxy?

> `optional` **openaiProxy?**: `boolean`

---

### codexProxy?

> `optional` **codexProxy?**: `boolean`

Enable the Codex door on its own.

Codex was reachable only from `neurolink proxy start` until this existed —
`createAllRoutes` mounted two of the doors, so an SDK consumer could not
expose it even deliberately.

---

### geminiProxy?

> `optional` **geminiProxy?**: `boolean`

Enable the Gemini door on its own, for the same reason.

---

### runtimeConfigProvider?

> `optional` **runtimeConfigProvider?**: [`ProxyRuntimeConfigProvider`](ProxyRuntimeConfigProvider.md)

Runtime config provider for engines that read it (currently: Codex
outbound fallback). NOTE: this option alone cannot make the Codex
outbound fallback's `anthropic` target reachable — that leg dispatches
through an in-process loopback (`loopbackPort` / `internalDispatch`)
that only `createCodexProxyRoutes`' direct, non-`CreateRoutesOptions`
parameters carry (the CLI's `neurolink proxy start` wires them; this
generic SDK route surface deliberately does not gain a new option for
it). Enabling the feature with an `anthropic` target here logs one
startup warning and then fails every such request at attempt time. A
`vertex`-only configuration is unaffected. See
docs/features/codex-proxy-support.md.
