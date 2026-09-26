[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareDriftVerdict

# Type Alias: ProxyShareDriftVerdict

> **ProxyShareDriftVerdict** = \{ `drifted`: `false`; `reason`: `"no_baseline"` \| `"attributable"` \| `"quiet"`; \} \| \{ `drifted`: `true`; `unexplainedSessionPct`: `number`; `unexplainedWeeklyPct`: `number`; `detail`: `string`; \}

The verdict of comparing one heartbeat against the account's real movement.

## Union Members

### Type Literal

\{ `drifted`: `false`; `reason`: `"no_baseline"` \| `"attributable"` \| `"quiet"`; \}

---

### Type Literal

\{ `drifted`: `true`; `unexplainedSessionPct`: `number`; `unexplainedWeeklyPct`: `number`; `detail`: `string`; \}

#### drifted

> **drifted**: `true`

#### unexplainedSessionPct

> **unexplainedSessionPct**: `number`

How much of a window moved without being accounted for.

#### unexplainedWeeklyPct

> **unexplainedWeeklyPct**: `number`

#### detail

> **detail**: `string`
