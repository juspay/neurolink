[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PausableDeadline

# Type Alias: PausableDeadline

> **PausableDeadline** = `object`

A deadline that can be paused (`pause()` returns the resume function) and
ended for good (`clear()`: a later resume re-arms nothing and the deadline
never fires).

## Properties

### pause

> **pause**: [`PauseDeadline`](PauseDeadline.md)

---

### clear

> **clear**: () => `void`

#### Returns

`void`
