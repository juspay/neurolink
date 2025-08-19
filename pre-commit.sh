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
  npm run format
  
  echo "🔧 Running lint..."
  npm run lint
  
  echo "🏗️  Running build..."
  npm run build
  
  echo "🧪 Running tests..."
  npm run test

  # Adding formatted files to git stage.
  echo "📝 Adding formatted files to git stage..."
  files="$(git diff --name-only --diff-filter=d)"
  if [[ -n "$files" ]]; then
    git add -- $files
  fi

  # Adding commit linter. Validates commit messages are according to format.
  # Runs before commit is created.
  # To try and fail VSCode and other editor commits if not properly formatted.
  echo "✅ Running commit message validation..."
  # Prefer commit-msg hook; if kept here, fallback to default COMMIT_EDITMSG path.
  pnpm exec commitlint --edit "${1:-$(git rev-parse --git-path COMMIT_EDITMSG)}"
  
  echo "🎉 All pre-commit checks passed!"
fi
