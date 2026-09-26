[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TerminalAgentModeOption

# Type Alias: TerminalAgentModeOption

> **TerminalAgentModeOption** = `boolean` \| \{ `version?`: [`TerminalAgentModeVersion`](TerminalAgentModeVersion.md); \}

Defined in: [types/agentMode.ts:8](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentMode.ts#L8)

Opt-in terminal agent mode. `true` applies the current instructions; the
object form pins a version so results stay comparable across releases.
