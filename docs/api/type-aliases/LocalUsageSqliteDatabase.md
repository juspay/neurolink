[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageSqliteDatabase

# Type Alias: LocalUsageSqliteDatabase

> **LocalUsageSqliteDatabase** = `object`

Defined in: [types/localUsage.ts:194](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L194)

The slice of `node:sqlite`'s `DatabaseSync` the OpenCode reader uses.

Deliberately minimal. `node:sqlite` is still flagged experimental and may
change shape between Node releases, so the reader validates this much at
runtime rather than trusting a type assertion — naming only what is actually
called keeps that check small and honest.

## Properties

### prepare

> **prepare**: (`sql`) => `object`

Defined in: [types/localUsage.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L195)

#### Parameters

##### sql

`string`

#### Returns

`object`

##### all

> **all**: () => `unknown`[]

###### Returns

`unknown`[]

---

### close

> **close**: () => `void`

Defined in: [types/localUsage.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L196)

#### Returns

`void`
