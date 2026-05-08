[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupabaseConfig

# Type Alias: SupabaseConfig

> **SupabaseConfig** = `object`

Defined in: [types/auth.ts:711](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L711)

Supabase provider configuration

## Properties

### url

> **url**: `string`

Defined in: [types/auth.ts:713](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L713)

Supabase project URL

---

### anonKey

> **anonKey**: `string`

Defined in: [types/auth.ts:715](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L715)

Supabase anon key

---

### serviceRoleKey?

> `optional` **serviceRoleKey?**: `string`

Defined in: [types/auth.ts:717](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L717)

Supabase service role key (for backend operations)

---

### jwtSecret?

> `optional` **jwtSecret?**: `string`

Defined in: [types/auth.ts:719](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L719)

JWT secret for custom token verification
