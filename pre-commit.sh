#!/usr/bin/env bash

set -e

finish() {
  result=$?
  # Add cleanup code here
  if [ $result -eq 0 ]; then
    echo "✅ Pre-commit hook completed successfully"
  else
    echo "❌ Pre-commit hook failed with exit code $result"
  fi
  exit ${result}
}
trap finish EXIT ERR

# Running check and validate scripts in commits.
# Validates Typescript compilation, formatting, linting
# test cases and attempts prod build.
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"

if [[ "$BRANCH_NAME" != "HEAD" ]]; then
  echo "🔍 Running pre-commit checks on branch: $BRANCH_NAME"
  
  # `check` (svelte-check + tsc) and `validate:all` (validate + lint +
  # validate:env + validate:security) touch no shared state: `.svelte-kit/**`,
  # the only thing `check` writes, is ignored by eslint (eslint.config.js) and
  # by prettier (.prettierignore). So they run concurrently.
  #
  # Measured: 59s + 110s sequential -> 48s together.
  #
  # `format:staged` still runs first and alone — it REWRITES staged files, and
  # linting them while they are being rewritten is a race.
  
  echo "🎨 Running format..."
  npm run format:staged

  # Provider-catalog codegen freshness — fails fast, before the longer
  # check/validate stages, if the per-provider JSON changed but the
  # generated enums/types/index were not regenerated to match.
  echo "🧬 Checking provider catalog codegen is current..."
  npm run codegen:catalog -- --check

  # `validate:all` is `validate && lint && validate:env && validate:security`,
  # so calling `lint` separately above ran the repo-wide prettier+eslint
  # twice. Measured here: lint 115s, validate:all 110s — validate:all is
  # almost entirely that second lint. Nothing is checked less, just once.
  #
  # The build that used to follow is gone too: pre-push builds, and nothing
  # about the tree changes between commit and push, so it was a second full
  # `vite build` + `prepack` (69s) for an artifact the push rebuilt anyway.
  echo "📋 Running check and validate in parallel..."
  check_log="$(mktemp)"
  validate_log="$(mktemp)"
  # `wait` must sit in a condition context. This script installs `trap finish
  # ERR`, and bash fires the ERR trap on a failing command even under `set +e`
  # — so a bare `wait "$pid"; rc=$?` aborted the hook the moment a stage
  # failed, before either log was printed. The exit code looked right and the
  # diagnostics were gone.
  check_rc=0
  validate_rc=0
  npm run check        > "$check_log"    2>&1 &
  check_pid=$!
  npm run validate:all > "$validate_log" 2>&1 &
  validate_pid=$!
  wait "$check_pid"    || check_rc=$?
  wait "$validate_pid" || validate_rc=$?

  # Print both logs whatever happens, so a failure is never hidden behind the
  # other stage's output and a passing run still shows what ran.
  echo "--- check ---";    cat "$check_log"
  echo "--- validate ---"; cat "$validate_log"
  rm -f "$check_log" "$validate_log"

  if [ "$check_rc" -ne 0 ] || [ "$validate_rc" -ne 0 ]; then
    echo "❌ check exited $check_rc, validate exited $validate_rc"
    exit 1
  fi

  # Continuous test suites require API keys and run separately
  echo "⏭️  Skipping tests (continuous test suites require API keys - run manually with pnpm test)"

  # Adding formatted files to git stage.
  #
  # `git diff --name-only` (worktree vs index) lists every file prettier just
  # reformatted on disk, but ALSO any unrelated file with in-progress edits
  # that were never staged for this commit. Re-adding that raw list sweeps
  # unrelated WIP into the commit. Only files that are BOTH just-reformatted
  # AND already staged for this commit (index vs HEAD) should be re-added.
  #
  # This protects files you never staged. It does NOT give you partial
  # staging: for a file with both staged and unstaged hunks, prettier
  # formats the whole worktree copy and the `git add` below stages all of
  # it, unstaged hunks included — exactly as before this change. Fixing
  # that means formatting the staged blob in isolation and re-applying the
  # unstaged patch, which is a larger change than this one.
  echo "📝 Adding formatted files to git stage..."
  staged_files=()
  while IFS= read -r -d '' f; do
    staged_files+=("$f")
  done < <(git diff --cached --name-only --diff-filter=d -z)

  if [[ ${#staged_files[@]} -gt 0 ]]; then
    files_to_add=()
    while IFS= read -r -d '' f; do
      for s in "${staged_files[@]}"; do
        if [[ "$f" == "$s" ]]; then
          files_to_add+=("$f")
          break
        fi
      done
    done < <(git diff --name-only --diff-filter=d -z)

    if [[ ${#files_to_add[@]} -gt 0 ]]; then
      git add -- "${files_to_add[@]}"
    fi
  fi

  echo "🎉 All pre-commit checks passed!"
fi