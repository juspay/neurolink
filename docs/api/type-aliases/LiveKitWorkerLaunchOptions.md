[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitWorkerLaunchOptions

# Type Alias: LiveKitWorkerLaunchOptions

> **LiveKitWorkerLaunchOptions** = `object`

Defined in: [types/livekit.ts:190](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L190)

Options for `startVoiceAgentWorker` — launches the LiveKit Agents worker.

## Properties

### agentFile

> **agentFile**: `string`

Defined in: [types/livekit.ts:195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L195)

Absolute path to the entry file whose default export is the result of
`defineVoiceAgent`. LiveKit re-imports this file in each job process.

---

### agentName?

> `optional` **agentName?**: `string`

Defined in: [types/livekit.ts:197](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L197)

Name the worker registers under for dispatch (default "neurolink-voice").
