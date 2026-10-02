---
id: automatic
title: Automatic
sidebar_label: Automatic
---

# Automatic

**Status:** ✅ Production
**Type:** Consumer intelligence · Operations hub
**Stack:** SvelteKit + NeuroLink SDK + Shopify API

## Purpose

Automatic is a Shopify merchant operations connector. It routes order and address data through NeuroLink's pipe to surface address quality grades and return-to-origin (RTO) risk scores — giving merchants AI-driven insight on every order before fulfillment.

## Stream Types

| Stream                  | Direction | Description                                                 |
| ----------------------- | --------- | ----------------------------------------------------------- |
| Shopify order data      | → Pipe    | Orders fetched via Shopify GraphQL and Vayu backend         |
| Address strings         | → Pipe    | Delivery addresses sent to external validation service      |
| Pincode + order context | → Pipe    | COD flag, order value, address score for RTO model          |
| Validation results      | Pipe →    | Grade (A–E), score (0–100), spam flag, missing fields       |
| RTO assessment          | Pipe →    | Risk level (HIGH/MEDIUM/LOW), probability %, reason factors |

## Input / Output Contract

### POST `/automatic/analytics`

```json
{
  "QueryIdentifier": "ORDERS_DETAILS | ORDERS_COUNT | PENDING_ORDERS_COUNT",
  "shopUrl": "store.myshopify.com",
  "QueryParams": { "reverse": true }
}
```

**Returns:** Array of Shopify order nodes with full order data.

### POST `/automatic/address`

```json
{
  "address": "123 Main St, Bangalore 560001",
  "advanced_mode": true,
  "model": "pro"
}
```

**Returns:**

```json
{
  "grade": "B",
  "score": 74,
  "spam": false,
  "reason": "Missing apartment number",
  "missing_fields": ["address2"]
}
```

### POST `/automatic/rto`

```json
{
  "pincode": "560098",
  "isCODOrder": true,
  "orderValue": 1499,
  "addressScore": 74
}
```

**Returns:**

```json
{
  "risk": "HIGH",
  "probability": 82,
  "reason": "high-rto-pincode,cod-order,low-address-score"
}
```

### POST `/automatic/rto/pincode`

```json
{ "pincode": "560098" }
```

**Returns:** `{ "isRtoPincode": true }`

## NeuroLink Integration

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Lazy-initialized — tools registered on first access
export const neurolink = new NeuroLink({});
```

Automatic uses NeuroLink for MCP tool registry, HITL conversation types, and OpenTelemetry observability. Provider selection happens at generation time in other parts of the application.

**Features used:**

- MCP tool registry and execution
- OpenTelemetry logging (DEBUG / INFO / WARN / ERROR severity)
- HITL types from `@juspay/neurolink`
- Conversation memory configuration types

## Gateway Unlocked

Automatic gives Shopify merchants:

- **Address intelligence** — grade every delivery address before shipping
- **RTO prediction** — flag high-risk orders (COD + bad pincode + low address score)
- **Operational clarity** — every order carries an AI risk signal, no manual review needed

## Operational Notes

- Address validation and 2-second UX delay run concurrently via `Promise.all()`
- Request bodies validated with type decoders and Zod schemas
- All endpoints return `createFailureResponse()` (400) on error with descriptive message
- NeuroLink instance lazy-initialized — `ensureToolsRegistered()` called on first use
- Session auth: Shopify session tokens via `validateAuth()` middleware
