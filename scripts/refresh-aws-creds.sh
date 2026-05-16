#!/usr/bin/env bash
# Refresh AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN in
# .env from an AWS SSO profile. Run before live Bedrock test suites if the
# previous tokens have expired (the typical symptom is `[bedrock] AWS
# Bedrock error: The security token included in the request is expired`).
#
# Requires:
#   - AWS CLI v2 on PATH (Homebrew installs to /opt/homebrew/bin/aws)
#   - SSO profile configured in ~/.aws/config under
#     [profile $AWS_SSO_PROFILE] with sso_session entry
#   - Active `aws sso login` session (run it manually first if expired)
#
# Usage:
#   AWS_SSO_PROFILE=AWSAdministratorAccess-671255721112 \
#     scripts/refresh-aws-creds.sh

set -euo pipefail

PROFILE="${AWS_SSO_PROFILE:-AWSAdministratorAccess-671255721112}"
ENV_FILE="${ENV_FILE:-.env}"
AWS_BIN="${AWS_BIN:-/opt/homebrew/bin/aws}"

if [[ ! -x "$AWS_BIN" ]]; then
  AWS_BIN="$(command -v aws)"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found" >&2
  exit 1
fi

# Verify SSO session is still valid; if not, prompt the user.
if ! "$AWS_BIN" sts get-caller-identity --profile "$PROFILE" >/dev/null 2>&1; then
  echo "❌ SSO session expired for profile '$PROFILE'." >&2
  echo "   Run interactively: $AWS_BIN sso login --profile $PROFILE" >&2
  exit 1
fi

CREDS="$("$AWS_BIN" configure export-credentials --profile "$PROFILE" --format env)"
ACCESS_KEY="$(echo "$CREDS" | grep '^export AWS_ACCESS_KEY_ID=' | cut -d= -f2-)"
SECRET="$(echo "$CREDS" | grep '^export AWS_SECRET_ACCESS_KEY=' | cut -d= -f2-)"
TOKEN="$(echo "$CREDS" | grep '^export AWS_SESSION_TOKEN=' | cut -d= -f2-)"

if [[ -z "$ACCESS_KEY" || -z "$SECRET" || -z "$TOKEN" ]]; then
  echo "❌ Could not extract credentials for profile '$PROFILE'." >&2
  exit 1
fi

# Update .env in place. sed -i differs between BSD (macOS) and GNU; use a
# tmpfile pattern that works in both.
tmp="$(mktemp)"
awk -v ak="$ACCESS_KEY" -v sk="$SECRET" -v tk="$TOKEN" '
  /^AWS_ACCESS_KEY_ID=/ { print "AWS_ACCESS_KEY_ID=\"" ak "\""; next }
  /^AWS_SECRET_ACCESS_KEY=/ { print "AWS_SECRET_ACCESS_KEY=\"" sk "\""; next }
  /^AWS_SESSION_TOKEN=/ { print "AWS_SESSION_TOKEN=\"" tk "\""; next }
  { print }
' "$ENV_FILE" > "$tmp"
mv "$tmp" "$ENV_FILE"

echo "✅ Refreshed AWS credentials in $ENV_FILE (profile=$PROFILE)"
