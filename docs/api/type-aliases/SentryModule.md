[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryModule

# Type Alias: SentryModule

> **SentryModule** = `object`

Defined in: [types/observability.ts:524](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L524)

Minimal view of the dynamically-imported @sentry/node module.

## Properties

### init

> **init**: (`options`) => `void`

Defined in: [types/observability.ts:525](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L525)

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

Defined in: [types/observability.ts:531](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L531)

#### Parameters

##### callback

(`scope`) => `void`

#### Returns

`void`

---

### captureException

> **captureException**: (`error`) => `void`

Defined in: [types/observability.ts:532](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L532)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### startInactiveSpan

> **startInactiveSpan**: (`options`) => `object`

Defined in: [types/observability.ts:533](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L533)

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

Defined in: [types/observability.ts:539](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L539)

#### Parameters

##### timeout

`number`

#### Returns

`Promise`\<`boolean`\>

---

### close

> **close**: (`timeout`) => `Promise`\<`boolean`\>

Defined in: [types/observability.ts:540](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L540)

#### Parameters

##### timeout

`number`

#### Returns

`Promise`\<`boolean`\>
