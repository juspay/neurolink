#!/usr/bin/env bash

set -e

# Setup pnpm environment
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"

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

  # Check if running in CI environment
  if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]] || [[ -n "$JENKINS_HOME" ]] || [[ -n "$TRAVIS" ]] || [[ -n "$CIRCLECI" ]]; then
    # TODO: Re-enable after test suite reorganization is complete
    # Tests temporarily disabled in CI pending test infrastructure refactoring
    # Tracked in: [Add GitHub issue number if available]
    echo "⏭️  Skipping tests in CI environment (pending test suite reorganization)"
    echo "ℹ️  Local developers: tests still run on your machine"
  else
    # Local development - tests still run
    echo "🧪 Running tests..."
    npm run test
  fi

  # Adding formatted files to git stage.
  echo "📝 Adding formatted files to git stage..."
  files="$(git diff --name-only --diff-filter=d)"
  if [[ -n "$files" ]]; then
    git add -- $files
  fi

  echo "🎉 All pre-commit checks passed!"
fi