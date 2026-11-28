[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRuleErrorJson

# Type Alias: ProviderRuleErrorJson

> **ProviderRuleErrorJson** = `object`

One error-classification rule. It matches when ANY of its triggers fires:
a status (`status`, `statusRange`), an error name or code (`errorName`,
`errorCode`), or its patterns (`pattern` / `allPatterns`, optionally
narrowed by `patternStatuses` or `patternWhenNoStatus`). Rules are tried in
order; the first match wins.

## Properties

### status?

> `optional` **status?**: `number` \| `number`[]

HTTP status, or list of statuses, that triggers the rule.

---

### statusRange?

> `optional` **statusRange?**: \[`number`, `number`\]

Inclusive HTTP status range, e.g. [500, 599].

---

### messageStatus?

> `optional` **messageStatus?**: `number` \| `number`[]

Status written in the message text as an HTTP status ("HTTP 429", "error 401").

---

### errorName?

> `optional` **errorName?**: `string` \| `string`[]

`error.name` values (e.g. "TimeoutError", "ThrottlingException").

---

### errorCode?

> `optional` **errorCode?**: `string` \| `string`[]

`error.code` values, searched through the cause chain (e.g. "ECONNREFUSED").

---

### bodyErrorType?

> `optional` **bodyErrorType?**: `string` \| `string`[]

OpenAI-style error type, read from `error.type` or the JSON body's `error.type`.

---

### always?

> `optional` **always?**: `boolean`

Matches every error; for a catch-all last rule.

---

### pattern?

> `optional` **pattern?**: `string`

Regular expression tested against the message.

---

### allPatterns?

> `optional` **allPatterns?**: `string`[]

Regular expressions that must ALL match; an alternative to `pattern`.

---

### notPattern?

> `optional` **notPattern?**: `string`

When this matches, the pattern trigger does not fire.

---

### caseSensitive?

> `optional` **caseSensitive?**: `boolean`

Patterns are case-insensitive unless this is true.

---

### searchResponseBody?

> `optional` **searchResponseBody?**: `boolean`

Patterns also search the error's `responseBody`.

---

### patternStatuses?

> `optional` **patternStatuses?**: `number`[]

Restrict the pattern trigger to these statuses; status matching stays independent.

---

### patternWhenNoStatus?

> `optional` **patternWhenNoStatus?**: `boolean`

The pattern trigger fires only when the error carries no HTTP status.

---

### class

> **class**: [`CatalogErrorRuleClass`](CatalogErrorRuleClass.md)

---

### message?

> `optional` **message?**: `string`

Message for the classified error. Placeholders: `{model}`, `{message}`
(the raw message), `{provider}`, and any variable the provider supplies
(for example `{baseURL}`, already redacted). Required unless the rule
names a `messageHook`.

---

### messageWhen?

> `optional` **messageWhen?**: `object`[]

Alternative messages, chosen by the first pattern that matches the error message.

#### pattern

> **pattern**: `string`

#### message

> **message**: `string`

---

### messageHook?

> `optional` **messageHook?**: `string`

Named message builder for messages that need logic data cannot express
(for example a list of model suggestions). Used instead of `message`.
