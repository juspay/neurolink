[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupabaseConfig

# Type Alias: SupabaseConfig

> **SupabaseConfig** = `object`

Defined in: [types/auth.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L711)

Supabase provider configuration

## Properties

### url

> **url**: `string`

Defined in: [types/auth.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L713)

Supabase project URL

---

### anonKey

> **anonKey**: `string`

Defined in: [types/auth.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L715)

Supabase anon key

---

### serviceRoleKey?

> `optional` **serviceRoleKey?**: `string`

Defined in: [types/auth.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L717)

Supabase service role key (for backend operations)

---

### jwtSecret?

> `optional` **jwtSecret?**: `string`

Defined in: [types/auth.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L719)

JWT secret for custom token verification
