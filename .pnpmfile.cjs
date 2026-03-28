/**
 * pnpm hook to strip heavy transitive dependencies that are no longer needed.
 *
 * Problem: @juspay/hippocampus peers on @juspay/neurolink@9.14.0 which
 * pulls in ffprobe-static (335MB), @opentelemetry/auto-instrumentations-node,
 * and @opentelemetry/sdk-node. We've replaced these in the current version
 * but the old peer still drags them in.
 */
function readPackage(pkg) {
  // Strip heavy deps from the old neurolink version resolved as hippocampus peer
  if (pkg.name === "@juspay/neurolink" && pkg.version?.startsWith("9.14")) {
    delete pkg.dependencies?.["ffprobe-static"];
    delete pkg.optionalDependencies?.["ffprobe-static"];
    delete pkg.dependencies?.["@opentelemetry/auto-instrumentations-node"];
    delete pkg.dependencies?.["@opentelemetry/sdk-node"];
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
