#!/usr/bin/env tsx

/**
 * create-version.ts
 *
 * Automatically creates a new documentation version for minor/major releases.
 * Reads the version from the root package.json and creates a Docusaurus version
 * only when the patch version is 0 (indicating a minor or major release).
 *
 * Usage: pnpm tsx scripts/create-version.ts
 *        or: pnpm docs:version
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Path to the root package.json (relative to docs-site)
const ROOT_PACKAGE_JSON = path.resolve(__dirname, "../../package.json");
const DOCS_SITE_DIR = path.resolve(__dirname, "..");
const VERSIONS_FILE = path.join(DOCS_SITE_DIR, "versions.json");

type PackageJson = {
  version: string;
  [key: string]: unknown;
};

/**
 * Parse a semver version string into its components
 */
function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  // Handle versions like "1.2.3", "1.2.3-beta.1", etc.
  const cleanVersion = version.replace(/^v/, "").split("-")[0];
  const parts = cleanVersion.split(".");

  // Validate version format
  if (parts.length !== 3 || parts.some((part) => isNaN(Number(part)))) {
    throw new Error(
      `Invalid version format: "${version}". Expected format: "X.Y.Z" (e.g., "1.2.3")`
    );
  }

  const [major, minor, patch] = parts.map(Number);

  return {
    major,
    minor,
    patch,
  };
}

/**
 * Check if a version already exists in versions.json
 */
function versionExists(version: string): boolean {
  if (!fs.existsSync(VERSIONS_FILE)) {
    return false;
  }

  try {
    const versions = JSON.parse(fs.readFileSync(VERSIONS_FILE, "utf-8"));
    return Array.isArray(versions) && versions.includes(version);
  } catch {
    return false;
  }
}

/**
 * Main function to create a version if needed
 */
async function createVersion(): Promise<void> {
  console.log("Checking if documentation version should be created...\n");

  // Read root package.json
  if (!fs.existsSync(ROOT_PACKAGE_JSON)) {
    console.error(`Error: Root package.json not found at ${ROOT_PACKAGE_JSON}`);
    process.exit(1);
  }

  const packageJson: PackageJson = JSON.parse(
    fs.readFileSync(ROOT_PACKAGE_JSON, "utf-8")
  );
  const { version } = packageJson;

  console.log(`Current version from package.json: ${version}`);

  // Parse the version
  const { major, minor, patch } = parseVersion(version);
  console.log(`Parsed version: major=${major}, minor=${minor}, patch=${patch}`);

  // Only create a version for minor/major releases (patch === 0)
  if (patch !== 0) {
    console.log(
      `\nSkipping: Patch version is ${patch} (not 0). Documentation versions are only created for minor/major releases.`
    );
    return;
  }

  // Create version string (e.g., "8.39" for version "8.39.0")
  const docVersion = `${major}.${minor}`;

  // Check if this version already exists
  if (versionExists(docVersion)) {
    console.log(`\nSkipping: Version ${docVersion} already exists in versions.json`);
    return;
  }

  console.log(`\nCreating documentation version: ${docVersion}`);

  try {
    // Run docusaurus docs:version command
    execSync(`npx docusaurus docs:version ${docVersion}`, {
      cwd: DOCS_SITE_DIR,
      stdio: "inherit",
    });

    console.log(`\nSuccessfully created documentation version ${docVersion}`);
  } catch (error) {
    console.error(`\nError creating documentation version:`, error);
    process.exit(1);
  }
}

// Run the script
createVersion().catch((error) => {
  console.error("Version creation failed:", error);
  process.exit(1);
});
