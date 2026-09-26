[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryModule

# Type Alias: SentryModule

> **SentryModule** = `object`

Minimal view of the dynamically-imported @sentry/node module.

## Properties

### init

> **init**: (`options`) => `void`

#### Parameters

##### options

###### dsn

`string`

###### tracesSampleRate

`number`

###### release?

`string`

###### environment

`string`

#### Returns

`void`

---

### withScope

> **withScope**: (`callback`) => `void`

#### Parameters

##### callback

(`scope`) => `void`

#### Returns

`void`

---

### captureException

> **captureException**: (`error`) => `void`

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### startInactiveSpan

> **startInactiveSpan**: (`options`) => `object`

#### Parameters

##### options

###### name

`string`

###### op

`string`

###### startTime

`number`

###### attributes?

`Record`\<`string`, `unknown`\>

#### Returns

`object`

##### end

> **end**: (`timestamp?`) => `void`

###### Parameters

###### timestamp?

`number`

###### Returns

`void`

---

### flush

> **flush**: (`timeout`) => `Promise`\<`boolean`\>

#### Parameters

##### timeout

`number`

#### Returns

`Promise`\<`boolean`\>

---

### close

> **close**: (`timeout`) => `Promise`\<`boolean`\>

#### Parameters

##### timeout

`number`

#### Returns

`Promise`\<`boolean`\>
