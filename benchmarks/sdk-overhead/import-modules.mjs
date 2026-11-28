// Counts the modules one import of dist/index.js loads, grouped by package.
//   node import-modules.mjs <dist/index.js>
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const distArg = process.argv[2];
const distUrl = distArg.startsWith("file:")
  ? distArg
  : pathToFileURL(path.resolve(distArg)).href;
// The selected build's own folder, wherever it lives (dist/ or a copy).
const buildRoot = new URL(".", distUrl).href;
const loaded = new Set();
registerHooks({
  load(url, context, next) {
    loaded.add(url);
    return next(url, context);
  },
});

await import(distUrl);

const byPackage = {};
let ownFiles = 0;
for (const url of loaded) {
  const match = url.match(
    /node_modules\/\.pnpm\/[^/]+\/node_modules\/((?:@[^/]+\/)?[^/]+)/,
  );
  if (match) {
    byPackage[match[1]] = (byPackage[match[1]] || 0) + 1;
  } else if (url.startsWith(buildRoot) && !url.includes("/node_modules/")) {
    ownFiles++;
  }
}
const top = Object.entries(byPackage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([name, files]) => ({ name, files }));

console.log(
  JSON.stringify({
    totalModules: loaded.size,
    neurolinkFiles: ownFiles,
    thirdPartyPackages: Object.keys(byPackage).length,
    topPackages: top,
  }),
);
process.exit(0);
