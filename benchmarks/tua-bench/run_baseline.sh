#!/usr/bin/env bash
# Run TUA-Bench tasks x N attempts with one harness, then preserve evidence.
# Usage: run_baseline.sh <run-name> <tua-bench-dir> [attempts] [concurrency]
# Env: MODEL, TASK_LIST (space-separated subset), NEUROLINK_TGZ, NEUROLINK_EXTRA_ARGS,
#      NEUROLINK_BUNDLE (offline runtime from build_bundle.sh, built from NEUROLINK_TGZ),
#      AGENT_IMPORT_PATH (default: the Neurolink adapter), AGENT_ARGS (extra harbor args,
#      e.g. "--ak thinking=disabled"), CLAUDE_CODE_BUNDLE (for claude_code_ledger),
#      ENV_IMPORT_PATH (unset: podman cache for the Mac; empty: harbor's Docker default),
#      MODEL_UPSTREAM + ANTHROPIC_API_KEY (direct API) or NEUROLINK_PROXY_BASE_URL (proxy);
#      with neither, the local Neurolink proxy is discovered (Mac + podman).
#      KEEP_CONTAINERS=0 removes each trial's container when it ends (the task
#      image stays), so a long run does not fill the disk.
set -euo pipefail

RUN_NAME=$1
TUA=$2
ATTEMPTS=${3:-3}
CONCURRENCY=${4:-3}
MODEL=${MODEL:-anthropic/claude-sonnet-4-5-20250929}
AGENT_IMPORT_PATH=${AGENT_IMPORT_PATH:-neurolink_agent.agent:NeurolinkCode}
ENV_IMPORT_PATH=${ENV_IMPORT_PATH-cached_podman:CachedPodmanEnvironment}
KEEP_CONTAINERS=${KEEP_CONTAINERS:-1}
read -r -a AGENT_ARGV <<< "${AGENT_ARGS:-}"
HERE=$(cd "$(dirname "$0")" && pwd)
WORKTREE=$(cd "$HERE/../.." && pwd)
# A frozen copy of this directory has no dist/ of its own; point at any Neurolink CLI.
NEUROLINK_CLI=${NEUROLINK_CLI:-$WORKTREE/dist/cli/index.js}
EVIDENCE=${EVIDENCE_ROOT:-$HOME/Developer/tua-evidence}/$RUN_NAME
TGZ=${NEUROLINK_TGZ:-$HERE/neurolink_agent/neurolink.tgz}
DEFAULT_TASKS="017-clean-movie-titles 018-calculate-total-earnings 079-fix-mp3-metadata
  093-merge-txt-document 106-create-charles-ssh-user
  115-remove-explorer-find-key 119-tabstop-sentence-split"
read -r -a TASKS <<< "$(echo ${TASK_LIST:-$DEFAULT_TASKS})"

sha256() {
  if command -v sha256sum > /dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi
}

# Only the Neurolink adapter installs a Neurolink tarball.
if [[ "$AGENT_IMPORT_PATH" == neurolink_agent.* ]]; then
  [ -f "$TGZ" ] || { echo "tarball not found: $TGZ" >&2; exit 1; }
fi
if [ -n "${NEUROLINK_BUNDLE:-}" ]; then
  # A bundle built from a different tarball would silently test other code.
  want=$(sha256 "$TGZ" | cut -d' ' -f1)
  grep -q "^neurolink_tgz_sha256=$want\$" "$NEUROLINK_BUNDLE.txt" ||
    { echo "bundle was not built from $TGZ" >&2; exit 1; }
fi
if [ -n "${MODEL_UPSTREAM:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "MODEL_UPSTREAM is set but ANTHROPIC_API_KEY is not" >&2
  exit 1
fi

[ -e "$EVIDENCE" ] && { echo "evidence dir exists: $EVIDENCE" >&2; exit 1; }
mkdir -p "$EVIDENCE"
chmod 700 "$EVIDENCE"

proxy_status() {
  [ -f "$NEUROLINK_CLI" ] || { echo "no local neurolink CLI"; return; }
  node "$NEUROLINK_CLI" proxy status 2>&1 |
    sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+/<account>/g'
}

# Discover the local proxy only when no model access was configured.
USE_LOCAL_PROXY=0
if [ -z "${MODEL_UPSTREAM:-}" ] && [ -z "${NEUROLINK_PROXY_BASE_URL:-}" ]; then
  PORT=$(proxy_status | sed -nE 's/.*URL: +http:\/\/127\.0\.0\.1:([0-9]+).*/\1/p' | head -1)
  [ -n "$PORT" ] || { echo "proxy port not found; is the proxy running?" >&2; exit 1; }
  NEUROLINK_PROXY_BASE_URL="http://host.containers.internal:$PORT"
  USE_LOCAL_PROXY=1
fi
export NEUROLINK_PROXY_BASE_URL=${NEUROLINK_PROXY_BASE_URL:-}

{
  echo "run=$RUN_NAME model=$MODEL attempts=$ATTEMPTS concurrency=$CONCURRENCY"
  echo "started=$(date -u +%FT%TZ) host=$(uname -sm)"
  echo "model_upstream=${MODEL_UPSTREAM:-} proxy=${NEUROLINK_PROXY_BASE_URL:-}"
  echo "environment=${ENV_IMPORT_PATH:-docker} keep_containers=$KEEP_CONTAINERS"
  echo "harness_commit=$(git -C "$WORKTREE" rev-parse HEAD 2>/dev/null || echo "frozen copy at $HERE")"
  echo "tua_commit=$(git -C "$TUA" rev-parse HEAD)"
  echo "tasks=${TASKS[*]}"
  echo "neurolink_tgz=$TGZ"
  echo "neurolink_extra_args=${NEUROLINK_EXTRA_ARGS:-}"
  echo "agent=$AGENT_IMPORT_PATH agent_args=${AGENT_ARGS:-}"
  echo "neurolink_bundle=${NEUROLINK_BUNDLE:-}"
  echo "claude_code_bundle=${CLAUDE_CODE_BUNDLE:-}"
  [ -n "${CLAUDE_CODE_BUNDLE:-}" ] && cat "$CLAUDE_CODE_BUNDLE.txt"
  [ -n "${NEUROLINK_BUNDLE:-}" ] && cat "$NEUROLINK_BUNDLE.txt"
  for f in "$TGZ" "$HERE/neurolink_agent/agent.py" "$HERE/neurolink_agent/model_ledger.mjs" \
    "$HERE/cached_podman.py" "$HERE/ledger_summary.py" "$HERE/model_access.py" \
    "$HERE/claude_code_ledger/agent.py"; do
    [ -f "$f" ] && sha256 "$f"
  done
} > "$EVIDENCE/RUN.txt"
[ "$USE_LOCAL_PROXY" = 1 ] && proxy_status > "$EVIDENCE/proxy-before.txt"

INCLUDES=()
for task in "${TASKS[@]}"; do INCLUDES+=(-i "$task"); done
ENV_ARGS=()
[ -n "$ENV_IMPORT_PATH" ] && ENV_ARGS=(--environment-import-path "$ENV_IMPORT_PATH")
DELETE_ARGS=(--no-delete)
[ "$KEEP_CONTAINERS" = 0 ] && DELETE_ARGS=()

set +e
(
  cd "$TUA"
  NEUROLINK_TGZ="$TGZ" \
  PYTHONPATH="$HERE:$TUA" \
  .venv/bin/harbor run -p tasks "${INCLUDES[@]}" \
    --agent-import-path "$AGENT_IMPORT_PATH" ${AGENT_ARGV[@]+"${AGENT_ARGV[@]}"} \
    -m "$MODEL" \
    ${ENV_ARGS[@]+"${ENV_ARGS[@]}"} \
    --ve PYTHONFAULTHANDLER=1 --ve PYTHONPROFILEIMPORTTIME=1 \
    --agent-setup-timeout-multiplier 2 \
    -k "$ATTEMPTS" -n "$CONCURRENCY" -r 0 ${DELETE_ARGS[@]+"${DELETE_ARGS[@]}"} \
    -o "jobs/$RUN_NAME" --yes
) > "$EVIDENCE/harbor.log" 2>&1
HARBOR_EXIT=$?
# Everything below is best-effort: evidence must be copied even if a step fails.
set +o pipefail
echo "harbor_exit=$HARBOR_EXIT finished=$(date -u +%FT%TZ)" >> "$EVIDENCE/RUN.txt"
[ "$USE_LOCAL_PROXY" = 1 ] && proxy_status > "$EVIDENCE/proxy-after.txt"

# Post-score 079 diagnostics (podman only): the official reward is already on
# the host, so restarting the retained container cannot change it.
if [[ "$ENV_IMPORT_PATH" == *podman* ]] && [ "$KEEP_CONTAINERS" = 1 ] && command -v podman > /dev/null; then
  for trial in "$TUA"/jobs/"$RUN_NAME"/*/079-fix-mp3-metadata__*; do
    [ -d "$trial" ] || continue
    container=$(basename "$trial" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/-/g')
    podman inspect "$container" --format '{{json .State}}' > "$trial/diag-container-state.json" 2>&1 || continue
    podman start "$container" > /dev/null 2>&1 || continue
    podman exec --user agent "$container" bash -c '
      set +e
      D=/tmp/diag-079; mkdir -p "$D"
      id > "$D/id"; readlink -f /home/user > "$D/home_user"
      sha256sum /home/user/Music/*.mp3 > "$D/mp3.before.sha256" 2>&1
      cat /sys/fs/cgroup/memory.events > "$D/memory.events.before" 2>&1
      /opt/venv/bin/python -c "
import glob
from mutagen.easyid3 import EasyID3
for path in sorted(glob.glob(\"/home/user/Music/*.mp3\")):
    try:
        tags = EasyID3(path)
        print(path, \"ok\", tags.get(\"artist\"), tags.get(\"title\"))
    except Exception as error:
        print(path, \"error\", type(error).__name__, error)
" > "$D/easyid3.txt" 2>&1
      timeout 600 /opt/venv/bin/python /tests/test_outputs.py > "$D/test.stdout" 2> "$D/test.stderr"
      status=$?
      echo "$status" > "$D/test.exit"
      cat /sys/fs/cgroup/memory.events > "$D/memory.events.after" 2>&1
    ' || true
    mkdir -p "$trial/post-score-diagnostics"
    podman cp "$container:/tmp/diag-079/." "$trial/post-score-diagnostics/" > /dev/null 2>&1 || true
    podman stop "$container" > /dev/null 2>&1 || true
  done
fi

cp -R "$TUA/jobs/$RUN_NAME" "$EVIDENCE/jobs"
# A real API key must never reach the evidence; say so loudly if it did.
if [ -n "${MODEL_UPSTREAM:-}" ] && [ "${#ANTHROPIC_API_KEY}" -ge 20 ]; then
  if grep -rqF -- "$ANTHROPIC_API_KEY" "$EVIDENCE" "$TUA/jobs/$RUN_NAME"; then
    echo "secret_scan=FOUND" >> "$EVIDENCE/RUN.txt"
    echo "API key found in evidence for $RUN_NAME; do not share it" >&2
  else
    echo "secret_scan=clean" >> "$EVIDENCE/RUN.txt"
  fi
fi
python3 "$HERE/summarize_trials.py" "$EVIDENCE/jobs" "$TUA/tasks" "$EVIDENCE/summary" "$RUN_NAME" \
  | tee "$EVIDENCE/summary.txt"
find "$EVIDENCE" -type f ! -name HASHES.sha256 -print0 | sort -z | xargs -0 shasum -a 256 > "$EVIDENCE/HASHES.sha256" 2>/dev/null ||
  find "$EVIDENCE" -type f ! -name HASHES.sha256 -print0 | sort -z | xargs -0 sha256sum > "$EVIDENCE/HASHES.sha256"
echo "evidence: $EVIDENCE"
