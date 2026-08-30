[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageRequestUnit

# Type Alias: LocalUsageRequestUnit

> **LocalUsageRequestUnit** = `"turn"` \| `"session-snapshot"`

Defined in: [types/localUsage.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L128)

What one unit of `LocalUsageTotals.requests` actually counts.

Not cosmetic. Every reader but one counts assistant turns, so the CLI could
safely print "turns" for all of them. Cursor persists no per-turn record at
all — only a snapshot of the current context, one per session however many
turns that session ran — so printing "turns 1" for a two-hundred-turn
session states something false. The unit travels with the number for the
same reason `costConfidence` does: a figure rendered without saying what it
counts is the failure this whole subsystem exists to avoid.

Optional on the descriptor, defaulting to "turn", so adding it does not
break an existing caller constructing a descriptor of its own.
