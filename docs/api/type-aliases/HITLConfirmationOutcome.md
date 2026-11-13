[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLConfirmationOutcome

# Type Alias: HITLConfirmationOutcome

> **HITLConfirmationOutcome** = \{ `decision`: `"approved"` \| `"not-required"`; `args`: `unknown`; \} \| \{ `decision`: `"denied"`; `reason?`: `string`; \} \| \{ `decision`: `"timeout"` \| `"cancelled"`; `error`: `Error`; \}

Result of the shared confirmation step: the arguments to run with, or why
the call must not run.

## Union Members

### Type Literal

\{ `decision`: `"approved"` \| `"not-required"`; `args`: `unknown`; \}

#### decision

> **decision**: `"approved"` \| `"not-required"`

#### args

> **args**: `unknown`

The approver's modified arguments, else the requested ones

---

### Type Literal

\{ `decision`: `"denied"`; `reason?`: `string`; \}

#### decision

> **decision**: `"denied"`

#### reason?

> `optional` **reason?**: `string`

The approver's reason, if one was given

---

### Type Literal

\{ `decision`: `"timeout"` \| `"cancelled"`; `error`: `Error`; \}

#### decision

> **decision**: `"timeout"` \| `"cancelled"`

#### error

> **error**: `Error`

HITLTimeoutError, HITLCancelledError, or whatever ended the wait
