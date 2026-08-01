/**
 * Provider base-class conformance check (Issue #1177).
 *
 * Lives here, apart from any suite, because every `continuous-test-suite-*.ts`
 * is a self-executing script: each ends in a top-level `await runSuite(...)`,
 * and `runSuite` finishes with `process.exit()`. Importing one from another
 * therefore runs that whole suite and exits the process before the importer's
 * own tests get to run — so shared test logic has to live in a module with no
 * top-level side effects.
 *
 * Deliberately logging-free: each suite has its own local `logTest`, so this
 * returns a result and lets the caller report it.
 */

import * as path from "node:path";
import { ESLint } from "eslint";

const RULE_ID = "neurolink/provider-base-class";
const PROVIDER_GLOB = "src/lib/providers/**/*.ts";

export type ProviderBaseClassCheck = {
  ok: boolean;
  /** Files the glob actually matched. Zero means the check proved nothing. */
  checkedFiles: number;
  /** `path:line: message` for each violation. */
  failures: string[];
};

/**
 * Run the `provider-base-class` ESLint rule over the provider tree.
 *
 * Runs the real rule rather than re-implementing it, so there is a single
 * source of truth and no exclusion list to drift out of sync. The glob is
 * recursive, so providers nested in per-provider directories are covered.
 */
export async function checkProviderBaseClasses(): Promise<ProviderBaseClassCheck> {
  const eslint = new ESLint();
  const results = await eslint.lintFiles([PROVIDER_GLOB]);

  const failures: string[] = [];
  for (const result of results) {
    for (const msg of result.messages) {
      if (msg.ruleId === RULE_ID) {
        const relPath = path.relative(process.cwd(), result.filePath);
        failures.push(`${relPath}:${msg.line}: ${msg.message}`);
      }
    }
  }

  // A glob that matches nothing would otherwise report a cheerful pass while
  // verifying nothing at all — the failure mode a conformance check can least
  // afford.
  const checkedFiles = results.length;
  return {
    ok: checkedFiles > 0 && failures.length === 0,
    checkedFiles,
    failures,
  };
}
