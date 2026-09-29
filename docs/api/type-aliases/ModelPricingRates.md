[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelPricingRates

# Type Alias: ModelPricingRates

> **ModelPricingRates** = `object`

Per-token dollar rates for one model in the pricing table.

## Properties

### input

> **input**: `number`

---

### output

> **output**: `number`

---

### cacheRead?

> `optional` **cacheRead?**: `number`

---

### cacheCreation?

> `optional` **cacheCreation?**: `number`

---

### cacheCreation1h?

> `optional` **cacheCreation1h?**: `number`

1-hour TTL cache-write rate (Anthropic's 2x-of-input multiplier),
separate from `cacheCreation`'s 5-minute (1.25x) rate so a 1h-TTL
write is never silently priced at the 5m rate. `calculateCost()`
applies it to `TokenUsage.cacheCreation1hTokens`, the 1h share of the
cache-write total that the Claude route, the Vertex passthrough and
the Codex outbound fallback capture. Set on every Claude model; a
model without it prices that share at `cacheCreation`.
