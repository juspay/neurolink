/**
 * Descriptor snapshot control. Determinism exception to CLAUDE.md rule 15
 * (listed in the `allow` array of neurolink/e2e-tests-only in
 * eslint.config.js): PROVIDER_DESCRIPTORS and CATALOG_PROVIDER_IDS are not
 * exported from dist/index.js, and the point is an exact before/after
 * comparison of the chat descriptors. Walks the catalog ids, not array
 * position, and refuses an empty result or a wrong count.
 *
 * CLI: pnpm exec tsx test/helpers/descriptorSnapshot.ts --out <file> [--expect <n>]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROVIDER_DESCRIPTORS } from "../../src/lib/factories/providerDescriptors.js";
import { CATALOG_PROVIDER_IDS } from "../../src/lib/providers/catalog/index.generated.js";

const normalize = (value: unknown): unknown => {
  if (value instanceof RegExp) {
    return { $regex: value.source, $flags: value.flags };
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, normalize(child)]),
    );
  }
  return value;
};

export function toStableJson(value: unknown): string {
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
}

export function snapshotChatDescriptors(expectedCount?: number): string {
  const byName = new Map(
    PROVIDER_DESCRIPTORS.map((d) => [String(d.name), d] as const),
  );
  const chat = CATALOG_PROVIDER_IDS.map((id) => {
    const descriptor = byName.get(id);
    if (!descriptor) {
      throw new Error(`no descriptor for chat catalog id "${id}"`);
    }
    return descriptor;
  });
  if (chat.length === 0) {
    throw new Error("snapshot is empty: CATALOG_PROVIDER_IDS has no entries");
  }
  if (expectedCount !== undefined && chat.length !== expectedCount) {
    throw new Error(
      `expected ${expectedCount} chat descriptors, found ${chat.length}`,
    );
  }
  return toStableJson(chat);
}

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const out = flag("--out");
  const expectRaw = flag("--expect");
  const expected = expectRaw === undefined ? undefined : Number(expectRaw);
  if (!out || (expected !== undefined && !Number.isInteger(expected))) {
    console.error(
      "usage: tsx test/helpers/descriptorSnapshot.ts --out <file.json> [--expect <count>]",
    );
    process.exit(2);
  }
  const json = snapshotChatDescriptors(expected);
  writeFileSync(out, json);
  console.log(
    `wrote ${out} (${(JSON.parse(json) as unknown[]).length} descriptors)`,
  );
}
