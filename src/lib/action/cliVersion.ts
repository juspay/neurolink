// src/lib/action/cliVersion.ts
/**
 * The NeuroLink CLI version the GitHub Action installs when the
 * `neurolink_version` input is left empty.
 *
 * This is a deliberate, reviewed pin and not `latest`. The action runs with the
 * consumer's provider keys and `github.token` in its environment, so an
 * unpinned install would hand a single bad npm publish of `@juspay/neurolink`
 * to every consumer's workflow within minutes — and pinning the ACTION by SHA
 * would buy them nothing, because the code that actually runs is whatever the
 * install fetched. pnpm's `minimumReleaseAge` cooldown does not apply here
 * either: the action installs with npm.
 *
 * Why a committed constant and not the version in package.json: semantic-release
 * derives the published version from git tags and no longer commits the bump,
 * so `package.json#version` in this repository lags the registry by major
 * versions and would pin consumers to an ancient CLI.
 *
 * Bump it in a reviewed change (`pnpm run build:action` afterwards — the
 * committed bundle is diffed against a fresh build in CI). The supply-chain
 * suite checks that it is an exact `x.y.z` and that the version exists on the
 * registry with a provenance attestation.
 */
export const DEFAULT_NEUROLINK_CLI_VERSION = "13.8.16";

/** An exact `x.y.z` (optionally pre-release) — the only shape the installer accepts besides `latest`. */
export const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
