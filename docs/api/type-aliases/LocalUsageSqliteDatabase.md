[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageSqliteDatabase

# Type Alias: LocalUsageSqliteDatabase

> **LocalUsageSqliteDatabase** = `object`

Defined in: [types/localUsage.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L273)

The slice of `node:sqlite`'s `DatabaseSync` the OpenCode reader uses.

Deliberately minimal. `node:sqlite` is still flagged experimental and may
change shape between Node releases, so the reader validates this much at
runtime rather than trusting a type assertion — naming only what is actually
called keeps that check small and honest.

## Properties

### prepare

> **prepare**: (`sql`) => `object`

Defined in: [types/localUsage.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L274)

#### Parameters

##### sql

`string`

#### Returns

`object`

##### all

> **all**: (...`params`) => `unknown`[]

###### Parameters

###### params

...`unknown`[]

###### Returns

`unknown`[]

---

### close

> **close**: () => `void`

Defined in: [types/localUsage.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L275)

#### Returns

`void`
