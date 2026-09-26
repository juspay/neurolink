[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitWorkerLaunchOptions

# Type Alias: LiveKitWorkerLaunchOptions

> **LiveKitWorkerLaunchOptions** = `object`

Options for `startVoiceAgentWorker` — launches the LiveKit Agents worker.

## Properties

### agentFile

> **agentFile**: `string`

Absolute path to the entry file whose default export is the result of
`defineVoiceAgent`. LiveKit re-imports this file in each job process.

---

### agentName?

> `optional` **agentName?**: `string`

Name the worker registers under for dispatch (default "neurolink-voice").
