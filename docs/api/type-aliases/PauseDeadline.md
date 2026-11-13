[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PauseDeadline

# Type Alias: PauseDeadline

> **PauseDeadline** = () => () => `void`

Pauses the deadlines a model loop put around one tool call, for as long as
the call waits for something outside the tool (a human confirmation).
Returns the function that resumes them with the time that was left.

## Returns

() => `void`
