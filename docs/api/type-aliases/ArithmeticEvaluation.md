[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArithmeticEvaluation

# Type Alias: ArithmeticEvaluation

> **ArithmeticEvaluation** = \{ `ok`: `true`; `value`: `number`; \} \| \{ `ok`: `false`; `error`: `string`; \}

Outcome of evaluating a `calculateMath` expression with the built-in
arithmetic parser (no dynamic code). A result that is not a finite number
is reported as an error rather than as `Infinity`/`NaN`.
