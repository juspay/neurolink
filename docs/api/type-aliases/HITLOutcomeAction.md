[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLOutcomeAction

# Type Alias: HITLOutcomeAction

> **HITLOutcomeAction** = \{ `run`: `true`; `args`: `unknown`; \} \| \{ `run`: `false`; `error`: `Error`; \}

What the confirmation step means for one tool call, the same on every
execution path: run with these arguments, or refuse with this error.

## Union Members

### Type Literal

\{ `run`: `true`; `args`: `unknown`; \}

#### run

> **run**: `true`

#### args

> **args**: `unknown`

The approver's modified arguments, else the requested ones

---

### Type Literal

\{ `run`: `false`; `error`: `Error`; \}

#### run

> **run**: `false`

#### error

> **error**: `Error`

Why the call must not run; its message is the refusal text
