#!/usr/bin/env tsx
/**
 * Continuous Test Suite: HandlerRegistry<THandler> (no API).
 *
 * Covers the generic registry that every media-handler ecosystem (TTS, STT,
 * Realtime, Video, Music, Avatar) now composes instead of hand-rolling its
 * own Map<string, THandler>. This suite exercises the generic class in
 * isolation; each ecosystem's own unit suite separately asserts that its
 * processor still exposes the same public behavior after switching to it.
 *
 * Rule-15 exception: `HandlerRegistry` is pure internal composition plumbing
 * — it is never exported from any package entry point (root, ./voice,
 * ./music, ./avatar, or any other subpath), so there is no shipped surface
 * to drive end-to-end. This file is listed in the `neurolink/e2e-tests-only`
 * `allow` array in eslint.config.js for that reason (same justification as
 * the existing `continuous-test-suite-autoresearch.ts` entry: "Background
 * task system with no public surface at all").
 *
 * Run: npx tsx test/continuous-test-suite-handler-registry.ts
 */
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { HandlerRegistry } from "../src/lib/core/handlerRegistry.js";

const { test, runSuite } = defineSuite("HandlerRegistry (unit)");

type StubHandler = { id: string };

await test("register makes a provider resolvable via supports/get", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  const handler: StubHandler = { id: "h1" };
  registry.register("provider-a", handler);
  assertEqual(registry.supports("provider-a"), true, "supports() sees it");
  assertEqual(
    registry.get("provider-a"),
    handler,
    "get() returns the same instance",
  );
});

await test("provider names are normalized to lowercase", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  const handler: StubHandler = { id: "h1" };
  registry.register("Provider-A", handler);
  assertEqual(
    registry.supports("provider-a"),
    true,
    "lookup is case-insensitive",
  );
  assertEqual(
    registry.get("PROVIDER-A"),
    handler,
    "get() is also case-insensitive",
  );
});

await test("an unregistered provider is not claimed", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  assertEqual(
    registry.supports("nope"),
    false,
    "supports() is false for unknown providers",
  );
  assertEqual(
    registry.get("nope"),
    undefined,
    "get() returns undefined rather than throwing",
  );
});

await test("registering without a provider name throws", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  let threw = false;
  try {
    registry.register("", { id: "h1" });
  } catch (err) {
    threw = err instanceof Error && err.message === "Provider name is required";
  }
  assert(threw, "empty provider name is rejected with the expected message");
});

await test("registering without a handler throws", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  let threw = false;
  try {
    registry.register("provider-a", undefined as unknown as StubHandler);
  } catch (err) {
    threw = err instanceof Error && err.message === "Handler is required";
  }
  assert(threw, "missing handler is rejected with the expected message");
});

await test("re-registering a provider replaces the previous handler", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  const first: StubHandler = { id: "first" };
  const second: StubHandler = { id: "second" };
  registry.register("provider-a", first);
  registry.register("provider-a", second);
  assertEqual(
    registry.get("provider-a"),
    second,
    "the later registration wins",
  );
});

await test("list returns every registered provider name", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  registry.register("provider-a", { id: "a" });
  registry.register("provider-b", { id: "b" });
  const names = registry.list().sort();
  assertEqual(names.length, 2, "two providers registered");
  assertEqual(names[0], "provider-a", "first name present");
  assertEqual(names[1], "provider-b", "second name present");
});

await test("clear removes every registration", () => {
  const registry = new HandlerRegistry<StubHandler>("StubScope");
  registry.register("provider-a", { id: "a" });
  registry.clear();
  assertEqual(registry.list().length, 0, "no providers remain after clear()");
  assertEqual(
    registry.supports("provider-a"),
    false,
    "cleared provider is no longer supported",
  );
});

await test("two independent instances do not share state", () => {
  const registryOne = new HandlerRegistry<StubHandler>("ScopeOne");
  const registryTwo = new HandlerRegistry<StubHandler>("ScopeTwo");
  registryOne.register("provider-a", { id: "a" });
  assertEqual(
    registryTwo.supports("provider-a"),
    false,
    "each processor's registry is isolated",
  );
});

await runSuite();
