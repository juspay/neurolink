[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BadWordsConfig

# Type Alias: BadWordsConfig

> **BadWordsConfig** = `object`

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### list?

> `optional` **list?**: `string`[]

---

### regexPatterns?

> `optional` **regexPatterns?**: `string`[]

Regular expressions to redact, each applied with the `gi` flags. When set
they take priority over `list`.

Patterns run synchronously on the whole response, so a pattern that can
backtrack catastrophically would stall the process. A pattern is refused,
skipped and logged as an error (the same handling as an invalid regex,
never thrown at the caller) when it:

- is longer than 1000 characters;
- repeats a group in which a variable-length part (`+`, `*`, `?`, `{n,m}`)
  can match the same text as whatever follows it, so the input can be
  split many ways: `(a+)+`, `(\w+\s*)*`, `(.*a){10}`, `(a?a?)+`,
  `(a{1,30}){1,30}`;
- repeats a group whose alternatives may overlap, such as `(a|aa)+`;
- chains more than a handful of overlapping optional or open-ended parts,
  such as `a?a?a?a?a?a?a?a?a?` or `.*a.*b.*c.*d.*e.*f`;
- has a repetition bound above 500, such as `a{1,1000}`.

A repeated group is fine when each variable-length part is followed by
something it cannot match: `(\d{1,3}\.){3}`, `([a-z0-9-]+\.)+` and
`(?:\d[ -]?){13,16}` all run.

A skipped pattern filters nothing. Use `list` for plain terms, or flatten
the pattern (`[\w-]+` instead of `([\w-]+)+`).

Example patterns:

- SSN: '\\d{3}-\\d{2}-\\d{4}'
- Card number: '\\d{16}'
- Words: '\\b(password|secret)\\b'

---

### replacementText?

> `optional` **replacementText?**: `string`

Text to use when replacing filtered content.

#### Default

```ts
'[REDACTED]'

Examples:
- '[REDACTED]' (default)
- '***'
- '####'
- '[FILTERED]'
```
