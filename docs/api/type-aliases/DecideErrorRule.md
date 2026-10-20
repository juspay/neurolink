[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideErrorRule

# Type Alias: DecideErrorRule

> **DecideErrorRule** = `object`

## Properties

### status?

> `optional` **status?**: `number` \| readonly `number`[]

One status or a list of them. A rule sets this or `statusMin`, never both.

---

### statusMin?

> `optional` **statusMin?**: `number`

Matches every status at or above this value.

---

### messagePattern?

> `optional` **messagePattern?**: `string`

With a status, the rule also needs the error message to match this regular
expression (case-insensitive, searched in the first 2,000 characters of the
message after the key is removed). Bounded: no unescaped `*`, `+` or
`{n,}`, no quantifier on a group, no count above 255, and the counts side
by side multiply to at most 4,096 ways (each `?` is 2, each `{n,m}` is
m-n+1).

---

### kind

> **kind**: [`DecisionErrorKind`](DecisionErrorKind.md)

---

### retryable?

> `optional` **retryable?**: `boolean`

---

### hint?

> `optional` **hint?**: `string`

Text added after the error message, behind a dash, when this rule is the
one that matches. For a status the vendor uses for more than one cause,
where the body's own words name only one of them. `{apiKeyEnvVar}` is the
only placeholder. A `messagePattern` is judged on the message without it,
and the key is removed from it as from the message.
