[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkerInstanceOptions

# Type Alias: WorkerInstanceOptions

> **WorkerInstanceOptions** = `object`

Defined in: [types/isolatedAgent.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L51)

Options for `NeuroLink.createWorkerInstance()`.

A worker instance is a sub-agent-grade NeuroLink: conversation memory off,
orchestration off, observability inherited from the creating instance with
`autoDetectExternalProvider: true` + `skipLangfuseSpanProcessor: true`
(so worker spans join the host's tracer without duplicate Langfuse
exports), and an internal log bridge attached with a caller-supplied tag.

## Properties

### logTag?

> `optional` **logTag?**: `string`

Defined in: [types/isolatedAgent.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L53)

Tag stamped on every forwarded log event (default "worker").

---

### onLog?

> `optional` **onLog?**: (`event`) => `void`

Defined in: [types/isolatedAgent.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L75)

Log bridge sink. Fire-and-forget: listener errors never disrupt the
worker.

Receives only log events this worker emitted. The logger routes per
instance: the worker's `generate` / `stream` / `generateText` run their
bodies inside an AsyncLocalStorage scope carrying the worker's id, and
this bridge is subscribed to that id — so a sibling worker's, the host's
or a background MCP reconnect's logs never arrive here, and `tag` is
true attribution rather than "whichever bridge forwarded it".

Two things stay outside the scope, by construction:

- Logs emitted while a **consumer drains a returned stream**. Iteration
  happens in the consumer's async context, after `stream()` resolved.
- Logs emitted **outside any call** — construction, background MCP
  reconnects, module init. These are unattributed rather than charged to
  an arbitrary instance.

A process-wide sink (`logger.setEventEmitter`) still sees everything, so
a host bridge is unaffected by this narrowing.

#### Parameters

##### event

[`WorkerLogEvent`](WorkerLogEvent.md)

#### Returns

`void`

---

### shareToolRegistry?

> `optional` **shareToolRegistry?**: `boolean`

Defined in: [types/isolatedAgent.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L81)

Share the creating instance's tool registry (custom tools + in-memory
MCP servers) so the worker calls tools through the host's existing
connections. Default: true.

---

### config?

> `optional` **config?**: `Record`\<`string`, `unknown`\>

Defined in: [types/isolatedAgent.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L87)

Extra constructor config merged into the worker (e.g. `credentials`,
`tools`, `modelPool`). Worker-mode fields (memory off, orchestration
off, observability flags) always win over this merge.
