[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSecurityHeadersMiddleware

# Function: createSecurityHeadersMiddleware()

> **createSecurityHeadersMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:241](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/common.ts#L241)

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
