[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoDeliveryDecision

# Type Alias: VideoDeliveryDecision

> **VideoDeliveryDecision** = \{ `deliver`: `true`; `reason?`: `undefined`; \} \| \{ `deliver`: `false`; `reason`: `string`; \}

Outcome of asking whether one video may be handed to one provider as bytes.

A plain boolean collapsed "this provider never watches video" with "this
provider would have, but the clip is 400 MB" — and the two want different
log lines and different advice. `reason` is populated exactly when
`deliver` is false, and is phrased for a user to read.

The accepting arm declares `reason?: undefined` rather than omitting the
field. Not decoration: `build:react-hooks` type-checks this graph without
`--strict`, and there a negated boolean-literal discriminant does not
narrow, so `decision.reason` inside `if (!decision.deliver)` fails to
compile unless the property exists on both arms. Declaring it keeps the
union exact under strict and compilable under both.
