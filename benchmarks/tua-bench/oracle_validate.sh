#!/usr/bin/env bash
# Run every task's reference solution through its own verifier and keep only
# the tasks this host can pass. A task whose oracle fails here would score
# every harness 0 for reasons that have nothing to do with the harness.
# Usage: oracle_validate.sh <run-name> <tua-bench-dir> [concurrency]
# Env: ENV_IMPORT_PATH (unset = harbor's Docker default), EVIDENCE_ROOT,
#      TASK_LIST (space-separated subset; default every task)
# Writes <evidence>/<run-name>/oracle_passing.txt and oracle_failing.txt.
set -euo pipefail

RUN_NAME=$1
TUA=$2
CONCURRENCY=${3:-4}
HERE=$(cd "$(dirname "$0")" && pwd)
EVIDENCE=${EVIDENCE_ROOT:-$HOME/Developer/tua-evidence}/$RUN_NAME
[ -e "$EVIDENCE" ] && { echo "evidence dir exists: $EVIDENCE" >&2; exit 1; }
mkdir -p "$EVIDENCE"

ENV_ARGS=()
[ -n "${ENV_IMPORT_PATH:-}" ] && ENV_ARGS=(--environment-import-path "$ENV_IMPORT_PATH")
INCLUDES=()
for task in ${TASK_LIST:-}; do INCLUDES+=(-i "$task"); done

{
  echo "run=$RUN_NAME started=$(date -u +%FT%TZ) host=$(uname -sm)"
  echo "tua_commit=$(git -C "$TUA" rev-parse HEAD)"
  echo "environment=${ENV_IMPORT_PATH:-docker}"
  echo "tasks=${TASK_LIST:-all}"
} > "$EVIDENCE/RUN.txt"

set +e
(
  cd "$TUA"
  PYTHONPATH="$HERE:$TUA" \
  .venv/bin/harbor run -p tasks ${INCLUDES[@]+"${INCLUDES[@]}"} -a oracle ${ENV_ARGS[@]+"${ENV_ARGS[@]}"} \
    -k 1 -n "$CONCURRENCY" -r 1 --no-delete -o "jobs/$RUN_NAME" --yes
) > "$EVIDENCE/harbor.log" 2>&1
echo "harbor_exit=$? finished=$(date -u +%FT%TZ)" >> "$EVIDENCE/RUN.txt"
set -e

cp -R "$TUA/jobs/$RUN_NAME" "$EVIDENCE/jobs"
python3 - "$EVIDENCE" <<'EOF'
import json, re, sys
from pathlib import Path

evidence = Path(sys.argv[1])
# Trial folders are <NNN-task>__<id>; the job folder (<date>__<time>) is not one.
TRIAL = re.compile(r"^\d{3}-[a-z0-9-]+__[A-Za-z0-9]+$")
passing, failing, errors = [], [], []
for result in sorted(evidence.glob("jobs/**/*__*/result.json")):
    trial = result.parent
    if not TRIAL.match(trial.name):
        continue
    task = trial.name.split("__")[0]
    reward_file = trial / "verifier" / "reward.txt"
    raw = reward_file.read_text().strip() if reward_file.exists() else None
    exception = (json.loads(result.read_text()).get("exception_info") or {}).get("exception_type")
    if raw is None:
        # No verdict: an image build or environment error, not a failed oracle.
        errors.append((task, exception or "no reward"))
        continue
    try:
        full = float(raw) == 1.0
    except ValueError:
        full = False
    (passing if full else failing).append((task, raw))
(evidence / "oracle_passing.txt").write_text("".join(f"{t}\n" for t, _ in passing))
(evidence / "oracle_failing.txt").write_text("".join(f"{t}\t{r}\n" for t, r in failing))
(evidence / "oracle_errors.txt").write_text("".join(f"{t}\t{e}\n" for t, e in errors))
print(f"oracle: {len(passing)} pass, {len(failing)} fail or partial, {len(errors)} errored")
for task, raw in failing:
    print(f"  fail {task}: {raw}")
for task, error in errors:
    print(f"  error {task}: {error}")
EOF
