[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / configureGlobalMiddleware

# Function: configureGlobalMiddleware()

> **configureGlobalMiddleware**(`options`): `void`

Process-wide middleware defaults. Applies to every NeuroLink instance, below
the instance's own `middleware` option and above NEUROLINK_MIDDLEWARE_PRESET.
Replaces any earlier call rather than adding to it, and is read on each
generate()/stream(), so instances that already exist pick it up. Throws a
TypeError when `options` is not an object or names a preset that is not
built in.

## Parameters

### options

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md)

## Returns

`void`
