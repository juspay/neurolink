[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandState

# Type Alias: BackgroundCommandState

> **BackgroundCommandState** = `"queued"` \| `"running"` \| `"exited"` \| `"killed"` \| `"timeout"` \| `"output-limit"`

Defined in: [types/backgroundCommand.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L37)

Lifecycle of one background command.

`queued` is the window between the handle being returned and the OS
confirming the child started. The four settled states are deliberately
distinct: "the command failed" and "we killed it because it printed 4 GB"
are different facts about a run, and collapsing them loses the one a
reviewer needs.
