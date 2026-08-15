[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionValidationResult

# Type Alias: SessionValidationResult

> **SessionValidationResult** = `object`

Defined in: [types/auth.ts:276](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L276)

Session validation result

## Properties

### valid

> **valid**: `boolean`

Defined in: [types/auth.ts:278](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L278)

Whether the session is valid

---

### session?

> `optional` **session?**: [`AuthSession`](AuthSession.md)

Defined in: [types/auth.ts:280](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L280)

Validated session if valid

---

### error?

> `optional` **error?**: `string`

Defined in: [types/auth.ts:282](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L282)

Error message if validation failed

---

### errorCode?

> `optional` **errorCode?**: [`AuthErrorCode`](AuthErrorCode.md)

Defined in: [types/auth.ts:284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L284)

Error code for programmatic handling

---

### refreshed?

> `optional` **refreshed?**: `boolean`

Defined in: [types/auth.ts:286](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L286)

Whether session was refreshed
