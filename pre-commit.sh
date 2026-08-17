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
  
  echo "📋 Running check..."
  npm run check
  
  echo "🎨 Running format..."
  npm run format:staged
  
  echo "🔧 Running lint..."
  npm run lint
  
  echo "🔐 Running validate..."
  npm run validate:all

  echo "🏗️  Running build..."
  npm run build

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