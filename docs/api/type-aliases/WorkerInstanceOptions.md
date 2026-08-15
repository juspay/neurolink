[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkerInstanceOptions

# Type Alias: WorkerInstanceOptions

> **WorkerInstanceOptions** = `object`

Defined in: [types/isolatedAgent.ts:51](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L51)

Options for `NeuroLink.createWorkerInstance()`.

A worker instance is a sub-agent-grade NeuroLink: conversation memory off,
orchestration off, observability inherited from the creating instance with
`autoDetectExternalProvider: true` + `skipLangfuseSpanProcessor: true`
(so worker spans join the host's tracer without duplicate Langfuse
exports), and an internal log bridge attached with a caller-supplied tag.

## Properties

### logTag?

> `optional` **logTag?**: `string`

Defined in: [types/isolatedAgent.ts:53](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L53)

Tag stamped on every forwarded log event (default "worker").

---

### onLog?

> `optional` **onLog?**: (`event`) => `void`

Defined in: [types/isolatedAgent.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L66)

Log bridge sink. Fire-and-forget: listener errors never disrupt the
worker.

KNOWN LIMITATION: the underlying NeuroLink logger is process-global with
a single active emitter, so this bridge receives ALL NeuroLink log
events emitted in the process (host, other workers, MCP) for the
worker's lifetime, each stamped with this worker's `tag`. The tag
identifies which bridge forwarded the event, not which instance emitted
it. Per-instance log attribution requires per-instance logger routing —
tracked as follow-up work in the RFC.

#### Parameters

##### event

[`WorkerLogEvent`](WorkerLogEvent.md)

#### Returns

`void`

---

### shareToolRegistry?

> `optional` **shareToolRegistry?**: `boolean`

Defined in: [types/isolatedAgent.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L72)

Share the creating instance's tool registry (custom tools + in-memory
MCP servers) so the worker calls tools through the host's existing
connections. Default: true.

---

### config?

> `optional` **config?**: `Record`\<`string`, `unknown`\>

Defined in: [types/isolatedAgent.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L78)

Extra constructor config merged into the worker (e.g. `credentials`,
`tools`, `modelPool`). Worker-mode fields (memory off, orchestration
off, observability flags) always win over this merge.
