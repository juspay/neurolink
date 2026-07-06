/**
 * CLI → SkillsConfig mapping, following the toolRoutingFlags /
 * classifierRouterFlags pattern.
 *
 * `--skills-dir <path>` (or NEUROLINK_SKILLS_DIR) enables skills with a
 * filesystem store for generate / stream / batch / loop runs. Returns null
 * when neither is provided so the SDK stays skills-free by default.
 */

import type { SkillsConfig } from "../../lib/types/index.js";

export function buildSkillsConfigFromCli(
  options: Record<string, unknown>,
): SkillsConfig | null {
  const dir =
    (typeof options.skillsDir === "string" && options.skillsDir.trim()) ||
    (typeof process.env.NEUROLINK_SKILLS_DIR === "string" &&
      process.env.NEUROLINK_SKILLS_DIR.trim()) ||
    "";

  if (!dir) {
    return null;
  }

  return {
    enabled: true,
    storage: { type: "filesystem", path: dir },
  };
}
