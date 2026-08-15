[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TripwireEvaluator

# Class: TripwireEvaluator

Defined in: [utils/tripwireEvaluator.ts:42](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/tripwireEvaluator.ts#L42)

Manages and evaluates tripwire conditions against LLM response data.

## Example

```typescript
const evaluator = createDefaultTripwireEvaluator();

const result = evaluator.evaluate({
  responseText: "",
  latencyMs: 45000,
  finishReason: "length",
});

if (result.triggered && result.action === "abort") {
  throw new Error(result.message);
}
```

## Constructors

### Constructor

> **new TripwireEvaluator**(): `TripwireEvaluator`

#### Returns

`TripwireEvaluator`

## Methods

### register()

> **register**(`tripwire`): `void`

Defined in: [utils/tripwireEvaluator.ts:48](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/tripwireEvaluator.ts#L48)

Register a tripwire. Replaces any existing tripwire with the same id.

#### Parameters

##### tripwire

[`TripwireConfig`](../type-aliases/TripwireConfig.md)

#### Returns

`void`

---

### unregister()

> **unregister**(`id`): `boolean`

Defined in: [utils/tripwireEvaluator.ts:61](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/tripwireEvaluator.ts#L61)

Remove a registered tripwire by id.

#### Parameters

##### id

`string`

#### Returns

`boolean`

true if the tripwire was found and removed, false otherwise.

---

### evaluate()

> **evaluate**(`data`): [`TripwireResult`](../type-aliases/TripwireResult.md)

Defined in: [utils/tripwireEvaluator.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/tripwireEvaluator.ts#L80)

Evaluate all tripwires and return the highest-priority triggered result.

Priority order: "abort" > "warn" > "log"

Bug fix (C1): The original implementation returned on the FIRST triggered
tripwire regardless of action, which meant a "warn" registered before an
"abort" would mask the abort. This implementation evaluates ALL tripwires
and promotes the highest-severity action.

#### Parameters

##### data

[`TripwireData`](../type-aliases/TripwireData.md)

#### Returns

[`TripwireResult`](../type-aliases/TripwireResult.md)

---

### evaluateAll()

> **evaluateAll**(`data`): [`TripwireResult`](../type-aliases/TripwireResult.md)[]

Defined in: [utils/tripwireEvaluator.ts:135](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/tripwireEvaluator.ts#L135)

Evaluate all tripwires and return every triggered result.

#### Parameters

##### data

[`TripwireData`](../type-aliases/TripwireData.md)

#### Returns

[`TripwireResult`](../type-aliases/TripwireResult.md)[]

---

### getTripwires()

> **getTripwires**(): [`TripwireConfig`](../type-aliases/TripwireConfig.md)[]

Defined in: [utils/tripwireEvaluator.ts:169](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/tripwireEvaluator.ts#L169)

Return a shallow copy of all registered tripwires.

#### Returns

[`TripwireConfig`](../type-aliases/TripwireConfig.md)[]
