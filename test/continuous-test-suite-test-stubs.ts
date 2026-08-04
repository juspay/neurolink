#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Test-Double Helpers
 *
 * Covers test/helpers/stubs.ts, which the migrated suites rely on in place of
 * vi.spyOn/vi.fn. The helper is now load-bearing across several suites, so its
 * own edge cases — accessor properties, inherited members, restoration after a
 * throw — are pinned here rather than assumed.
 *
 * Run with: npx tsx test/continuous-test-suite-test-stubs.ts
 */

import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { observe, spy, stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("Test-Double Helpers");

await test("stub replaces a method, records calls, and restores it", () => {
  const target = { greet: (name: string) => `hello ${name}` };
  const s = stub(target, "greet", (name: string) => `stubbed ${name}`);

  assertEqual(target.greet("a"), "stubbed a", "the stub must be installed");
  assertEqual(s.callCount, 1, "the call must be recorded");
  assertEqual(
    JSON.stringify(s.calls[0]),
    JSON.stringify(["a"]),
    "arguments must be captured",
  );

  s.restore();
  assertEqual(target.greet("a"), "hello a", "the original must come back");
});

await test("stub does NOT invoke a getter while installing", () => {
  // Reading obj[key] to save the original would fire the getter — the very side
  // effect a test usually stubs the property to avoid.
  let getterCalls = 0;
  const target = {
    get handler() {
      getterCalls += 1;
      return () => "real";
    },
    set handler(_value: () => string) {
      /* present so the property is a full accessor pair */
    },
  };

  const s = stub(target, "handler", () => "stubbed" as never);
  assertEqual(getterCalls, 0, "installing must not read through the getter");
  assertEqual(
    (target.handler as unknown as () => string)(),
    "stubbed" as never,
    "the stub must actually take effect over an accessor",
  );

  s.restore();
  assertEqual(
    (target.handler as unknown as () => string)(),
    "real",
    "the accessor must be restored, not replaced by a data property",
  );
  assert(getterCalls > 0, "the restored getter must be the real one again");
});

await test("stub restores an own accessor as an accessor, not a value", () => {
  const target = {
    get value() {
      return "real";
    },
  };
  const before = Object.getOwnPropertyDescriptor(target, "value");
  stub(target, "value", (() => "stubbed") as never).restore();
  const after = Object.getOwnPropertyDescriptor(target, "value");

  assert(
    after?.get !== undefined && after.value === undefined,
    "the restored property must still be a getter",
  );
  assertEqual(
    after?.get === before?.get,
    true,
    "the original getter function must be the one restored",
  );
});

await test("stub deletes rather than shadows when the member is inherited", () => {
  class Base {
    speak(): string {
      return "base";
    }
  }
  const instance = new Base();
  const s = stub(
    instance as unknown as Record<string, unknown>,
    "speak",
    () => "stubbed",
  );
  assertEqual(instance.speak(), "stubbed", "the stub must take effect");

  s.restore();
  assert(
    !Object.prototype.hasOwnProperty.call(instance, "speak"),
    "restoring an inherited member must leave no own-property shadow",
  );
  assertEqual(
    instance.speak(),
    "base",
    "the prototype method must be reachable",
  );
});

await test("stub.restore is idempotent", () => {
  const target = { fn: () => "real" };
  const s = stub(target, "fn", () => "stubbed");
  s.restore();
  s.restore();
  assertEqual(
    target.fn(),
    "real",
    "a second restore must not re-install anything",
  );
});

await test("observe records calls while the real implementation still runs", () => {
  const seen: string[] = [];
  const target = {
    write(value: string) {
      seen.push(value);
    },
  };
  const o = observe(target, "write");

  target.write("x");
  assertEqual(o.callCount, 1, "the call must be recorded");
  assertEqual(
    JSON.stringify(seen),
    JSON.stringify(["x"]),
    "the real implementation must still have run",
  );

  o.restore();
  target.write("y");
  assertEqual(o.callCount, 1, "no calls may be recorded after restore");
  assertEqual(seen.length, 2, "the real implementation stays in place");
});

await test("observe preserves `this`", () => {
  const target = {
    count: 0,
    bump(): number {
      this.count += 1;
      return this.count;
    },
  };
  observe(target, "bump");
  target.bump();
  assertEqual(target.count, 1, "the receiver must still be the object");
});

await test("observe rejects a non-function property", () => {
  const target = { notAFunction: 42 };
  let threw = false;
  try {
    observe(target, "notAFunction");
  } catch (error) {
    threw = error instanceof TypeError;
  }
  assert(
    threw,
    "observing a non-function must be a TypeError, not a silent no-op",
  );
});

await test("withStubs restores in reverse order even when the body throws", async () => {
  const order: string[] = [];
  const target = { a: () => "a", b: () => "b" };
  const first = stub(target, "a", () => "stubbed-a");
  const second = stub(target, "b", () => "stubbed-b");
  const tracked = [
    {
      restore: () => {
        order.push("first");
        first.restore();
      },
    },
    {
      restore: () => {
        order.push("second");
        second.restore();
      },
    },
  ];

  let caught: unknown;
  try {
    await withStubs(tracked, () => {
      throw new Error("body exploded");
    });
  } catch (error) {
    caught = error;
  }

  assert(caught instanceof Error, "the body's error must propagate");
  assertEqual(
    JSON.stringify(order),
    JSON.stringify(["second", "first"]),
    "restoration must run in reverse install order",
  );
  assertEqual(target.a(), "a", "stubs must be restored despite the throw");
  assertEqual(target.b(), "b", "stubs must be restored despite the throw");
});

await test("withStubs returns the body's value on success", async () => {
  const target = { fn: () => "real" };
  const s = stub(target, "fn", () => "stubbed");
  const result = await withStubs([s], () => target.fn());
  assertEqual(result, "stubbed", "the body's return value must pass through");
  assertEqual(target.fn(), "real", "the stub must still be restored");
});

await test("spy records calls to a standalone callback", () => {
  const s = spy((n: number) => n * 2);
  assertEqual(s.fn(21), 42, "the implementation must run");
  assertEqual(s.callCount, 1, "the call must be recorded");
  assertEqual(
    JSON.stringify(s.calls[0]),
    JSON.stringify([21]),
    "arguments must be captured",
  );
});

await runSuite();
