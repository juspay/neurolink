#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.proxy-observability.yaml"
ENV_FILE="${SCRIPT_DIR}/proxy-observability.env"
IMPORT_SCRIPT="${SCRIPT_DIR}/import-openobserve-dashboard.mjs"
DOCTOR_SCRIPT="${SCRIPT_DIR}/check-proxy-telemetry.mjs"

load_env() {
  if [[ -f "${ENV_FILE}" ]]; then
    while IFS= read -r line || [[ -n "${line}" ]]; do
      [[ "${line}" =~ ^[[:space:]]*$ ]] && continue
      [[ "${line}" =~ ^[[:space:]]*# ]] && continue

      line="${line#"${line%%[![:space:]]*}"}"
      if [[ "${line}" =~ ^[[:space:]]*export[[:space:]]+ ]]; then
        line="${line#export }"
      fi

      if [[ "${line}" != *=* ]]; then
        continue
      fi

      local key="${line%%=*}"
      local value="${line#*=}"

      key="${key#"${key%%[![:space:]]*}"}"
      key="${key%"${key##*[![:space:]]}"}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"

      if [[ "${value}" =~ ^\".*\"$ || "${value}" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      fi

      if [[ -n "${key}" ]]; then
        if [[ ! "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
          echo "Skipping invalid env var name in ${ENV_FILE}: ${key}" >&2
          continue
        fi
        printf -v "${key}" '%s' "${value}"
        export "${key}"
      fi
    done < "${ENV_FILE}"
  fi
}

select_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return
  fi

  if command -v podman-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(podman-compose)
    return
  fi

  echo "No supported compose command found. Install docker compose, docker-compose, or podman-compose." >&2
  exit 1
}

compose() {
  "${COMPOSE_CMD[@]}" -p "${NEUROLINK_OBSERVABILITY_PROJECT_NAME}" -f "${COMPOSE_FILE}" "$@"
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempts="${3:-60}"

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "${name} did not become healthy at ${url}" >&2
  return 1
}

print_status() {
  local openobserve_status="DOWN"
  local collector_status="DOWN"

  if curl -fsS "${NEUROLINK_OPENOBSERVE_URL}/healthz" >/dev/null 2>&1; then
    openobserve_status="UP"
  fi

  if curl -fsS "http://localhost:${NEUROLINK_OTEL_HEALTH_PORT}/" >/dev/null 2>&1; then
    collector_status="UP"
  fi

  cat <<EOF
OpenObserve: ${openobserve_status}
  UI: ${NEUROLINK_OPENOBSERVE_URL}
  Login: ${NEUROLINK_OPENOBSERVE_USER}

OTEL Collector: ${collector_status}
  OTLP gRPC: http://localhost:${NEUROLINK_OTLP_GRPC_PORT}
  OTLP HTTP: http://localhost:${NEUROLINK_OTLP_HTTP_PORT}
  Health: http://localhost:${NEUROLINK_OTEL_HEALTH_PORT}
EOF
}

print_usage() {
  cat <<EOF
Usage: bash scripts/observability/manage-local-openobserve.sh <command>

Commands:
  setup             Start OpenObserve + OTEL collector and import the dashboard
  up                Start the local stack
  start             Alias for up
  down              Stop the local stack
  stop              Alias for down
  logs              Follow stack logs
  status            Show stack health and URLs
  doctor            Validate proxy telemetry freshness across logs, traces, and metrics
  import-dashboard  Import the NeuroLink proxy dashboard and dedupe by title
EOF
}

load_env

: "${NEUROLINK_OPENOBSERVE_USER:=root@example.com}"
: "${NEUROLINK_OPENOBSERVE_PASSWORD:=Complexpass#123}"
: "${NEUROLINK_OPENOBSERVE_ORG:=default}"
: "${NEUROLINK_OPENOBSERVE_HTTP_PORT:=5080}"
: "${NEUROLINK_OPENOBSERVE_GRPC_PORT:=5081}"
: "${NEUROLINK_OTLP_GRPC_PORT:=14317}"
: "${NEUROLINK_OTLP_HTTP_PORT:=14318}"
: "${NEUROLINK_OTEL_HEALTH_PORT:=14333}"
: "${NEUROLINK_OTEL_METRICS_PORT:=18888}"
: "${NEUROLINK_OTEL_PPROF_PORT:=11777}"
: "${NEUROLINK_OBSERVABILITY_PROJECT_NAME:=neurolink-proxy-observability}"
: "${NEUROLINK_PROXY_STREAM_HEADER:=neurolink-proxy}"
: "${NEUROLINK_OPENOBSERVE_URL:=http://localhost:${NEUROLINK_OPENOBSERVE_HTTP_PORT}}"
: "${NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT:=http://openobserve:5080/api/${NEUROLINK_OPENOBSERVE_ORG}}"

if [[ -z "${NEUROLINK_OPENOBSERVE_BASIC_AUTH:-}" ]]; then
  encoded_auth="$(printf '%s' "${NEUROLINK_OPENOBSERVE_USER}:${NEUROLINK_OPENOBSERVE_PASSWORD}" | base64 | tr -d '\n')"
  export NEUROLINK_OPENOBSERVE_BASIC_AUTH="Basic ${encoded_auth}"
fi

export NEUROLINK_OPENOBSERVE_USER
export NEUROLINK_OPENOBSERVE_PASSWORD
export NEUROLINK_OPENOBSERVE_ORG
export NEUROLINK_OPENOBSERVE_HTTP_PORT
export NEUROLINK_OPENOBSERVE_GRPC_PORT
export NEUROLINK_OTLP_GRPC_PORT
export NEUROLINK_OTLP_HTTP_PORT
export NEUROLINK_OTEL_HEALTH_PORT
export NEUROLINK_OTEL_METRICS_PORT
export NEUROLINK_OTEL_PPROF_PORT
export NEUROLINK_OBSERVABILITY_PROJECT_NAME
export NEUROLINK_PROXY_STREAM_HEADER
export NEUROLINK_OPENOBSERVE_URL
export NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT

select_compose

# Write or update OTEL_EXPORTER_OTLP_ENDPOINT in ~/.neurolink/.env so the
# proxy picks it up automatically without any manual export.
upsert_neurolink_env() {
  local neurolink_dir="${HOME}/.neurolink"
  local env_file="${neurolink_dir}/.env"
  local endpoint="http://localhost:${NEUROLINK_OTLP_HTTP_PORT}"
  local key="OTEL_EXPORTER_OTLP_ENDPOINT"

  mkdir -p "${neurolink_dir}"
  chmod 700 "${neurolink_dir}" 2>/dev/null || true

  if [[ -f "${env_file}" ]] && grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}=" "${env_file}"; then
    # Replace existing line in-place (portable sed -i)
    sed -i.bak -E "s|^[[:space:]]*(export[[:space:]]+)?${key}=.*|${key}=${endpoint}|" "${env_file}"
    rm -f "${env_file}.bak"
  else
    # Ensure the new entry starts on its own line if the file lacks a trailing newline
    if [[ -f "${env_file}" ]] && [[ -s "${env_file}" ]] && [[ "$(tail -c 1 "${env_file}")" != "" ]]; then
      echo "" >> "${env_file}"
    fi
    echo "${key}=${endpoint}" >> "${env_file}"
  fi
  chmod 600 "${env_file}" 2>/dev/null || true

  echo "  Wrote ${key}=${endpoint} to ${env_file}"
}

command="${1:-setup}"

case "${command}" in
  setup)
    compose up -d
    wait_for_http "OpenObserve" "${NEUROLINK_OPENOBSERVE_URL}/healthz"
    wait_for_http "OTEL collector" "http://localhost:${NEUROLINK_OTEL_HEALTH_PORT}/"
    node "${IMPORT_SCRIPT}" --replace-by-title
    upsert_neurolink_env
    cat <<EOF
Local proxy observability is ready.

OpenObserve UI: ${NEUROLINK_OPENOBSERVE_URL}
OpenObserve login user: ${NEUROLINK_OPENOBSERVE_USER}
OpenObserve password source: ${ENV_FILE} (NEUROLINK_OPENOBSERVE_PASSWORD)
OTLP HTTP endpoint: http://localhost:${NEUROLINK_OTLP_HTTP_PORT}

OTEL endpoint written to ~/.neurolink/.env — the proxy will pick it up automatically on next start.
EOF
    ;;
  up|start)
    compose up -d
    upsert_neurolink_env
    ;;
  down|stop)
    compose down
    ;;
  logs)
    compose logs -f
    ;;
  status)
    print_status
    ;;
  doctor)
    node "${DOCTOR_SCRIPT}"
    ;;
  import-dashboard)
    node "${IMPORT_SCRIPT}" --replace-by-title
    ;;
  help|-h|--help)
    print_usage
    ;;
  *)
    print_usage >&2
    exit 1
    ;;
esac
