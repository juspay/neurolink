/**
 * Side-effect module for suites that build a `NeuroLink` and must not start
 * the MCP servers a checkout declares. Import it BEFORE `../dist/index.js`.
 *
 * `new NeuroLink()` used to load `<cwd>/.mcp-config.json` on its first call,
 * and the repository's own file starts `npx -y @modelcontextprotocol/server-filesystem`.
 * Since the 2026-10 hardening the SDK reads a project file only when asked
 * (`mcp.configPath` / `mcp.trustProjectConfig`, or the CLI's trust prompt), so
 * this helper is belt-and-braces: it keeps a suite independent of whatever a
 * checkout declares, including under older `dist/` builds, and leaves the
 * whole MCP initialisation in place with nothing to load, which
 * `NEUROLINK_SKIP_MCP` does not: that switch takes a different path through
 * the SDK.
 *
 * `process.chdir` moves the whole process, so this is for a suite that runs as
 * its own process (one suite per `tsx` call): a second suite loaded into the
 * same process would move the directory again and leave this one's behind.
 * Import it before `dotenv/config` and before anything else that reads `.env`
 * or `.mcp-config.json` from the working directory. Imported later, it loads
 * the checkout's files again, and no type check or lint rule notices.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const EMPTY_WORKING_DIRECTORY = mkdtempSync(
  join(tmpdir(), "neurolink-empty-cwd-"),
);
process.chdir(EMPTY_WORKING_DIRECTORY);

process.once("exit", () => {
  try {
    process.chdir(tmpdir());
    rmSync(EMPTY_WORKING_DIRECTORY, { recursive: true, force: true });
  } catch {
    // the operating system clears its temp directory in the end
  }
});
