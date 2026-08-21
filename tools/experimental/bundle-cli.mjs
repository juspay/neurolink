#!/usr/bin/env node
// Experimental / unwired: not referenced by any package.json script, prepack,
// pre-push hook, or CI workflow. Relocated out of scripts/ so its presence no
// longer implies it's part of an active build path. Run manually if needed:
//   node tools/experimental/bundle-cli.mjs [--minify] [--meta]
// Tracked as an open "revisit" item in
// docs/plans/2026-05-02-remove-aisdk-execution-agent-prompt.md.
import * as esbuild from "esbuild";
import { writeFileSync } from "fs";

const EXTERNAL_NATIVE = [
  "sharp",
  "canvas",
  "@napi-rs/canvas",
  "puppeteer",
  "ffprobe-static",
  "ffmpeg-static",
  "fsevents",
  "cpu-features",
  "ssh2",
  "bufferutil",
  "utf-8-validate",
];

// Stub out removed deps that old @juspay/neurolink@9.14.0 (hippocampus peer) still imports
const stubRemovedDepsPlugin = {
  name: "stub-removed-deps",
  setup(build) {
    const removed = [
      "@opentelemetry/sdk-node",
      "@opentelemetry/auto-instrumentations-node",
    ];
    for (const pkg of removed) {
      build.onResolve(
        { filter: new RegExp(`^${pkg.replace("/", "\\/")}$`) },
        () => ({
          path: pkg,
          namespace: "stub",
        }),
      );
    }
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents:
        "export default {}; export const NodeSDK = class {}; export function getNodeAutoInstrumentations() { return []; }",
      loader: "js",
    }));
  },
};

const result = await esbuild.build({
  entryPoints: ["src/cli/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/cli-bundle.mjs",
  minify: process.argv.includes("--minify"),
  sourcemap: true,
  metafile: true,
  banner: {
    js: 'import{createRequire as __cjsReq}from"module";const require=__cjsReq(import.meta.url);',
  },
  external: EXTERNAL_NATIVE,
  plugins: [stubRemovedDepsPlugin],
  logLevel: "warning",
});

const outSize =
  (result.metafile.outputs["dist/cli-bundle.mjs"]?.bytes || 0) / 1024 / 1024;
console.log(`✅ CLI bundle: dist/cli-bundle.mjs (${outSize.toFixed(1)} MB)`);

if (process.argv.includes("--meta")) {
  writeFileSync("dist/cli-bundle-meta.json", JSON.stringify(result.metafile));
  console.log("   Metafile: dist/cli-bundle-meta.json");
}
