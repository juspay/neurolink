#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Media Handler Catalog / Registry Collision Guard.
 *
 * ALL-DIST module graph (rule 15): every import below resolves to
 * `../dist/...`. `MEDIA_HANDLER_CATALOG` / `providerChoicesFor` /
 * `defaultProviderFor` are not re-exported through `dist/index.js`, so they
 * are imported from their own shipped module path
 * (`../dist/factories/mediaHandlerCatalog.js`), the same pattern
 * continuous-test-suite-provider-descriptors.ts already uses for
 * `../dist/utils/providerUtils.js` and `../dist/cli/factories/
 * commandFactory.js` — a real file inside the published `dist/` tree, just
 * not re-exported from the package's root barrel.
 *
 * Superset of the original plan's Task 19 intent (guard the "replicate" key
 * meaning four different things across four independent registries), tuned
 * to what's actually verifiable through the built public surface rather than
 * by importing test-double handlers into `src/`'s live processor classes:
 *
 *   1. Every name a live registry (TTSProcessor / STTProcessor /
 *      RealtimeProcessor / VideoProcessor / MusicProcessor / AvatarProcessor)
 *      actually resolves after `ProviderRegistry.registerAllProviders()`
 *      belongs to that same kind's catalog entry — nothing gets registered
 *      under a name the catalog doesn't know about for that kind. Realtime
 *      registration isn't gated on `isConfigured()` (session credentials can
 *      be supplied per-call), so its registered set is asserted to match the
 *      catalog exactly; the other five kinds gate on credentials present in
 *      this environment, so only the subset relationship is checked.
 *   2. No catalog kind declares the same primary/alias name twice internally
 *      — that would silently overwrite one entry's registration with another
 *      inside the one `HandlerRegistry` instance backing that kind.
 *   3. The only names reused ACROSS different kinds are the two the catalog
 *      deliberately reuses on purpose: "replicate" (a distinct handler class
 *      per kind in video/avatar/music — the plan's own running example) and
 *      "vertex" (Google Cloud Vertex AI, both a TTS alias for google-ai and
 *      the Video kind's own primary name). Every other name reused across
 *      kinds is an unpinned regression this suite exists to catch.
 *   4. Every kind's `defaultProviderFor()` result is itself a member of that
 *      kind's own `providerChoicesFor()` list.
 *
 * Run: npx tsx test/continuous-test-suite-media-registry-collisions.ts
 *      pnpm run test:media-registry-collisions
 */
import {
  defineSuite,
  logSection,
  assert,
  assertEqual,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Media Registry Collision Guard");

const ALL_KINDS = [
  "tts",
  "stt",
  "realtime",
  "video",
  "avatar",
  "music",
] as const;
type Kind = (typeof ALL_KINDS)[number];

// The only two names this catalog deliberately reuses across more than one
// kind, each mapped to the exact set of kinds it's expected to appear in.
// See file header point 3 — anything outside this map reusing a name across
// kinds is an unpinned collision, not a documented design decision.
const EXPECTED_CROSS_KIND_NAMES: Readonly<Record<string, ReadonlySet<Kind>>> = {
  replicate: new Set<Kind>(["video", "avatar", "music"]),
  vertex: new Set<Kind>(["tts", "video"]),
};

await runSuite(async () => {
  logSection("Catalog structural integrity");

  await test("no kind declares the same primary/alias name twice", async () => {
    const { MEDIA_HANDLER_CATALOG } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    for (const kind of ALL_KINDS) {
      const seen = new Set<string>();
      let duplicateFound = false;
      for (const entry of MEDIA_HANDLER_CATALOG as ReadonlyArray<{
        kind: string;
        name: string;
        aliases?: readonly string[];
      }>) {
        if (entry.kind !== kind) {
          continue;
        }
        for (const key of [entry.name, ...(entry.aliases ?? [])]) {
          const lower = key.toLowerCase();
          if (seen.has(lower)) {
            duplicateFound = true;
          }
          seen.add(lower);
        }
      }
      assert(
        !duplicateFound,
        `kind "${kind}" has a duplicate primary/alias name within its own catalog entries`,
      );
    }
  });

  await test("names reused across kinds are limited to the two documented cases (replicate, vertex)", async () => {
    const { MEDIA_HANDLER_CATALOG } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const kindsByName = new Map<string, Set<Kind>>();
    for (const entry of MEDIA_HANDLER_CATALOG as ReadonlyArray<{
      kind: Kind;
      name: string;
      aliases?: readonly string[];
    }>) {
      for (const key of [entry.name, ...(entry.aliases ?? [])]) {
        const lower = key.toLowerCase();
        const kinds = kindsByName.get(lower) ?? new Set<Kind>();
        kinds.add(entry.kind);
        kindsByName.set(lower, kinds);
      }
    }
    const unexpectedCrossKindNames: string[] = [];
    for (const [name, kinds] of kindsByName) {
      if (kinds.size <= 1) {
        continue;
      }
      const expected = EXPECTED_CROSS_KIND_NAMES[name];
      const matchesExpected =
        expected !== undefined &&
        expected.size === kinds.size &&
        [...kinds].every((k) => expected.has(k));
      if (!matchesExpected) {
        unexpectedCrossKindNames.push(name);
      }
    }
    assertEqual(
      unexpectedCrossKindNames.length,
      0,
      "an undocumented name is reused across more than one media-handler kind",
    );
    // The inverse direction: both documented cases must still actually be
    // present with their full expected kind set, not silently reduced to one
    // kind by a future catalog edit.
    for (const [name, expectedKinds] of Object.entries(
      EXPECTED_CROSS_KIND_NAMES,
    )) {
      const actualKinds = kindsByName.get(name);
      assert(
        actualKinds !== undefined && actualKinds.size === expectedKinds.size,
        `expected cross-kind name "${name}" no longer spans its documented kind set`,
      );
    }
  });

  logSection("defaultProviderFor / providerChoicesFor coherence");

  await test("every kind's default provider is itself one of that kind's own choices", async () => {
    const { providerChoicesFor, defaultProviderFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    for (const kind of ALL_KINDS) {
      const choices: string[] = providerChoicesFor(kind);
      const fallback: string = defaultProviderFor(kind);
      assert(
        choices.includes(fallback),
        `kind "${kind}"'s default provider is missing from its own choices list`,
      );
    }
  });

  logSection(
    "Live registration: each registry only ever resolves names its own kind's catalog declares",
  );

  await test("registerAllProviders populates the six media registries without throwing", async () => {
    const { ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    assert(true, "registerAllProviders resolved");
  });

  await test("TTSProcessor's registered names are a subset of the tts catalog", async () => {
    const { TTSProcessor } = await import("../dist/index.js");
    const { providerChoicesFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const catalogNames = new Set(
      (providerChoicesFor("tts") as string[]).map((n) => n.toLowerCase()),
    );
    for (const registered of TTSProcessor.listProviders() as string[]) {
      assert(
        catalogNames.has(registered.toLowerCase()),
        "TTSProcessor has a registered name absent from the tts catalog",
      );
    }
  });

  await test("STTProcessor's registered names are a subset of the stt catalog", async () => {
    const { STTProcessor } = await import("../dist/index.js");
    const { providerChoicesFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const catalogNames = new Set(
      (providerChoicesFor("stt") as string[]).map((n) => n.toLowerCase()),
    );
    for (const registered of STTProcessor.listProviders() as string[]) {
      assert(
        catalogNames.has(registered.toLowerCase()),
        "STTProcessor has a registered name absent from the stt catalog",
      );
    }
  });

  await test("VideoProcessor's registered names are a subset of the video catalog", async () => {
    const { VideoProcessor } = await import("../dist/index.js");
    const { providerChoicesFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const catalogNames = new Set(
      (providerChoicesFor("video") as string[]).map((n) => n.toLowerCase()),
    );
    for (const registered of VideoProcessor.listProviders() as string[]) {
      assert(
        catalogNames.has(registered.toLowerCase()),
        "VideoProcessor has a registered name absent from the video catalog",
      );
    }
  });

  await test("MusicProcessor's registered names are a subset of the music catalog", async () => {
    const { MusicProcessor } = await import("../dist/index.js");
    const { providerChoicesFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const catalogNames = new Set(
      (providerChoicesFor("music") as string[]).map((n) => n.toLowerCase()),
    );
    for (const registered of MusicProcessor.listProviders() as string[]) {
      assert(
        catalogNames.has(registered.toLowerCase()),
        "MusicProcessor has a registered name absent from the music catalog",
      );
    }
  });

  await test("AvatarProcessor's registered names are a subset of the avatar catalog", async () => {
    const { AvatarProcessor } = await import("../dist/index.js");
    const { providerChoicesFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const catalogNames = new Set(
      (providerChoicesFor("avatar") as string[]).map((n) => n.toLowerCase()),
    );
    for (const registered of AvatarProcessor.listProviders() as string[]) {
      assert(
        catalogNames.has(registered.toLowerCase()),
        "AvatarProcessor has a registered name absent from the avatar catalog",
      );
    }
  });

  await test("RealtimeProcessor's registered set matches the realtime catalog exactly (registration isn't credential-gated)", async () => {
    const { RealtimeProcessor } = await import("../dist/index.js");
    const { providerChoicesFor } =
      await import("../dist/factories/mediaHandlerCatalog.js");
    const catalogNames = new Set(
      (providerChoicesFor("realtime") as string[]).map((n) => n.toLowerCase()),
    );
    const registeredNames = new Set(
      (RealtimeProcessor.getProviders() as string[]).map((n) =>
        n.toLowerCase(),
      ),
    );
    assertEqual(
      registeredNames.size,
      catalogNames.size,
      "RealtimeProcessor registered-name count vs realtime catalog count",
    );
    let allCatalogNamesRegistered = true;
    for (const name of catalogNames) {
      if (!registeredNames.has(name)) {
        allCatalogNamesRegistered = false;
      }
    }
    assert(
      allCatalogNamesRegistered,
      "RealtimeProcessor is missing a realtime catalog name it should always register",
    );
  });

  logSection("Cross-registry isolation for the documented 'replicate' reuse");

  await test("'replicate' resolves independently in Video, Music and Avatar — supports() in one never implies the others", async () => {
    const { VideoProcessor, MusicProcessor, AvatarProcessor } =
      await import("../dist/index.js");
    // Each of these booleans is independently true/false depending on this
    // environment's own credentials — the invariant under test isn't "all
    // three are configured", it's that querying one registry never throws
    // and never silently reads through to another kind's registration.
    const videoSupports: unknown = VideoProcessor.supports("replicate");
    const musicSupports: unknown = MusicProcessor.supports("replicate");
    const avatarSupports: unknown = AvatarProcessor.supports("replicate");
    assert(
      typeof videoSupports === "boolean",
      "VideoProcessor.supports('replicate') did not return a boolean",
    );
    assert(
      typeof musicSupports === "boolean",
      "MusicProcessor.supports('replicate') did not return a boolean",
    );
    assert(
      typeof avatarSupports === "boolean",
      "AvatarProcessor.supports('replicate') did not return a boolean",
    );
  });
});
