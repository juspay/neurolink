const { version: rootVersion } = require("./package.json");

/**
 * pnpm hook to cut the circular-peer shadow tree pulled in by
 * @juspay/hippocampus.
 *
 * Problem 1: @juspay/hippocampus peers on @juspay/neurolink, and pnpm
 * resolves that peer against an old *published* copy of this very package
 * (any 9.x today, previously 9.14.0 — it moves with every hippocampus
 * bump). That shadow copy drags in ffprobe-static (335MB),
 * @opentelemetry/auto-instrumentations-node, and @opentelemetry/sdk-node,
 * none of which the current package needs. Strip them regardless of which
 * 9.x patch/minor the shadow copy happens to resolve to, so this doesn't
 * silently become a no-op again on the next hippocampus release.
 *
 * Problem 2: @juspay/hippocampus is only ever loaded via a lazy
 * `createRequire` require (src/lib/memory/hippocampusInitializer.ts) — there
 * is no static or type-level import anywhere in src/. It has no business
 * being a devDependency, and pnpm's auto-install-peers would otherwise pull
 * the optional peer into the local dev tree anyway. Strip the self-
 * referential peer declaration for local installs of *this* package only
 * (matched by the version in package.json, not a hardcoded literal, so it
 * can't rot on the next version bump), leaving the real, consumer-facing
 * optional peerDependency in the published package.json untouched.
 */
function readPackage(pkg) {
  // Strip heavy deps from the old neurolink version resolved as hippocampus's peer.
  if (pkg.name === "@juspay/neurolink" && pkg.version?.startsWith("9.")) {
    delete pkg.dependencies?.["ffprobe-static"];
    delete pkg.optionalDependencies?.["ffprobe-static"];
    delete pkg.dependencies?.["@opentelemetry/auto-instrumentations-node"];
    delete pkg.dependencies?.["@opentelemetry/sdk-node"];
  }

  // Strip the self-referential hippocampus peer when resolving *this*
  // package locally, so pnpm's auto-install-peers doesn't drag hippocampus
  // (and its old-neurolink shadow copy) into our own dev tree. The
  // published package.json is unaffected — this hook only runs during
  // pnpm's local resolution, never during npm publish/pack.
  if (pkg.name === "@juspay/neurolink" && pkg.version === rootVersion) {
    delete pkg.peerDependencies?.["@juspay/hippocampus"];
    delete pkg.peerDependenciesMeta?.["@juspay/hippocampus"];
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
