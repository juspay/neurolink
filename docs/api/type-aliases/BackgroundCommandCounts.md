[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandCounts

# Type Alias: BackgroundCommandCounts

> **BackgroundCommandCounts** = `object`

Defined in: [types/backgroundCommand.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L177)

Outstanding commands for a session: `running` have not settled yet, and
`finished` have settled without anyone having looked at them since.

"Not looked at" rather than "ever finished" is what makes the number
actionable — reading a settled command's status or output clears it, so a
non-zero `finished` always means there is something new to read. Nothing is
discarded when it clears: the job, its logs and its artifacts stay exactly
where they were.

Carried on every command tool result and — via the checklist — on every
`tasks_list`, so the model learns a build finished without polling.

## Properties

### running

> **running**: `number`

Defined in: [types/backgroundCommand.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L177)

---

### finished

> **finished**: `number`

Defined in: [types/backgroundCommand.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L177)
