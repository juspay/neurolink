[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSecurityHeadersMiddleware

# Function: createSecurityHeadersMiddleware()

> **createSecurityHeadersMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:241](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/common.ts#L241)

Create security headers middleware
Adds common security headers to responses

## Parameters

### options?

#### contentSecurityPolicy?

`string`

Content Security Policy

#### frameOptions?

`false` \| `"DENY"` \| `"SAMEORIGIN"`

X-Frame-Options (default: DENY)

#### contentTypeOptions?

`false` \| `"nosniff"`

X-Content-Type-Options (default: nosniff)

#### hstsMaxAge?

`number` \| `false`

Strict-Transport-Security max age in seconds (default: 31536000)

#### referrerPolicy?

`string` \| `false`

Referrer-Policy (default: strict-origin-when-cross-origin)

#### customHeaders?

`Record`\<`string`, `string`\>

Additional custom headers

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(createSecurityHeadersMiddleware());
```
