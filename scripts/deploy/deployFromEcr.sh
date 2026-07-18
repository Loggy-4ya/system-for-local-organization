#!/usr/bin/env bash
#
# Deploy one immutable Nexus ECR release on its EC2 host.
#
# Invoked only by the environment-specific SSM document. The script acquires an
# EC2-side lock, materializes the runtime dotenv payload from Secrets Manager,
# validates the release bundle, recreates containers, waits for web health, and
# restores the previous release if any rollout step fails.
#
# Usage: scripts/deploy/deployFromEcr.sh <40-character-git-sha>
# Registry: .ai/docs/features/hosting_and_deployment.md

set -Eeuo pipefail

readonly RELEASE_SHA="${1:-}"
readonly NEXUS_ROOT="/opt/nexus"
readonly DEPLOYMENT_CONFIG="${NEXUS_ROOT}/deployment.env"
readonly LOCK_FILE="/var/lock/nexus-deploy.lock"

if [[ ! "${RELEASE_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid release SHA." >&2
  exit 2
fi

if [[ ! -r "${DEPLOYMENT_CONFIG}" ]]; then
  echo "Missing ${DEPLOYMENT_CONFIG}; the CDK EC2 bootstrap is incomplete." >&2
  exit 2
fi

# shellcheck disable=SC1090
source "${DEPLOYMENT_CONFIG}"

for name in AWS_REGION WEB_REPOSITORY_URI WORKER_REPOSITORY_URI RUNTIME_SECRET_ID; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing deployment setting ${name}." >&2
    exit 2
  fi
done

for command_name in aws docker flock; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command is unavailable: ${command_name}" >&2
    exit 2
  fi
done

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another Nexus deployment is already running." >&2
  exit 3
fi

readonly RELEASE_DIR="${NEXUS_ROOT}/releases/${RELEASE_SHA}"
readonly RELEASE_COMPOSE="${RELEASE_DIR}/docker-compose.deploy.yml"
readonly RELEASE_CADDY="${RELEASE_DIR}/Caddyfile"
readonly ACTIVE_COMPOSE="${NEXUS_ROOT}/docker-compose.deploy.yml"
readonly ACTIVE_CADDY="${NEXUS_ROOT}/Caddyfile"
readonly ACTIVE_ENV="${NEXUS_ROOT}/.env.local"
readonly ACTIVE_IMAGES="${NEXUS_ROOT}/.images.env"
readonly PREVIOUS_DIR="${NEXUS_ROOT}/previous"

for release_file in "${RELEASE_COMPOSE}" "${RELEASE_CADDY}"; do
  if [[ ! -s "${release_file}" ]]; then
    echo "Release bundle is incomplete: ${release_file}" >&2
    exit 2
  fi
done

install -d -m 0700 "${PREVIOUS_DIR}"
rm -f "${PREVIOUS_DIR}/docker-compose.deploy.yml" \
  "${PREVIOUS_DIR}/Caddyfile" \
  "${PREVIOUS_DIR}/.env.local" \
  "${PREVIOUS_DIR}/.images.env"

for active_file in docker-compose.deploy.yml Caddyfile .env.local .images.env; do
  if [[ -f "${NEXUS_ROOT}/${active_file}" ]]; then
    cp -a "${NEXUS_ROOT}/${active_file}" "${PREVIOUS_DIR}/${active_file}"
  fi
done

rollback() {
  local exit_code=$?
  trap - ERR
  set +e
  echo "Deployment failed; restoring the previous Nexus release." >&2

  if [[ -s "${PREVIOUS_DIR}/.images.env" ]]; then
    for previous_file in docker-compose.deploy.yml Caddyfile .env.local .images.env; do
      if [[ -f "${PREVIOUS_DIR}/${previous_file}" ]]; then
        cp -a "${PREVIOUS_DIR}/${previous_file}" "${NEXUS_ROOT}/${previous_file}"
      fi
    done
    chmod 0600 "${ACTIVE_ENV}" "${ACTIVE_IMAGES}"
    deploy_active_release
  else
    echo "No previous release exists; leaving failed containers for SSM diagnostics." >&2
  fi

  exit "${exit_code}"
}
trap rollback ERR

worker_is_configured() {
  local env_file="$1"
  local key
  for key in TELEGRAM_OPERATOR_SESSION TELEGRAM_API_ID TELEGRAM_API_HASH TELEGRAM_BOT_TOKEN; do
    if ! grep -Eq "^${key}=.+" "${env_file}"; then
      return 1
    fi
  done
}

deploy_active_release() {
  local -a services=(web caddy)
  local -a compose=(
    docker compose
    --project-directory "${NEXUS_ROOT}"
    --env-file "${ACTIVE_IMAGES}"
    --file "${ACTIVE_COMPOSE}"
  )

  "${compose[@]}" config --quiet
  "${compose[@]}" pull

  if worker_is_configured "${ACTIVE_ENV}"; then
    services+=(telegram-worker)
  else
    "${compose[@]}" stop telegram-worker >/dev/null 2>&1 || true
    "${compose[@]}" rm --force telegram-worker >/dev/null 2>&1 || true
    echo "Telegram operator credentials are incomplete; worker deployment is disabled."
  fi

  "${compose[@]}" up --detach --remove-orphans "${services[@]}"

  local web_container
  web_container="$("${compose[@]}" ps --quiet web)"
  if [[ -z "${web_container}" ]]; then
    echo "Compose did not create the Nexus web container." >&2
    return 1
  fi

  local attempt health
  for attempt in $(seq 1 60); do
    health="$(docker inspect --format '{{.State.Health.Status}}' "${web_container}" 2>/dev/null || true)"
    case "${health}" in
      healthy)
        return 0
        ;;
      unhealthy)
        "${compose[@]}" logs --tail 100 web >&2
        return 1
        ;;
    esac
    sleep 5
  done

  "${compose[@]}" logs --tail 100 web >&2
  echo "Nexus web container did not become healthy within five minutes." >&2
  return 1
}

umask 077
new_runtime_env="$(mktemp "${NEXUS_ROOT}/.env.local.XXXXXX")"
new_image_env="$(mktemp "${NEXUS_ROOT}/.images.env.XXXXXX")"
trap 'rm -f "${new_runtime_env:-}" "${new_image_env:-}"' EXIT

aws secretsmanager get-secret-value \
  --region "${AWS_REGION}" \
  --secret-id "${RUNTIME_SECRET_ID}" \
  --query SecretString \
  --output text >"${new_runtime_env}"

for required_env in MONGODB_URI NEXTAUTH_SECRET NEXTAUTH_URL S3_MEDIA_BUCKET S3_MEDIA_REGION S3_MEDIA_PUBLIC_BASE_URL; do
  if ! grep -Eq "^${required_env}=.+" "${new_runtime_env}"; then
    echo "Runtime secret is missing required variable ${required_env}." >&2
    exit 2
  fi
done

if ! grep -Eq '^MEDIA_STORAGE_DRIVER=s3$' "${new_runtime_env}"; then
  echo "Runtime secret must set MEDIA_STORAGE_DRIVER=s3." >&2
  exit 2
fi

if ! grep -Eq '^NEXTAUTH_URL=https://[^[:space:]]+$' "${new_runtime_env}"; then
  echo "Runtime secret must set NEXTAUTH_URL to a public HTTPS origin." >&2
  exit 2
fi

registry="${WEB_REPOSITORY_URI%%/*}"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${registry}" >/dev/null

resolve_image_digest() {
  local repository_uri="$1"
  local repository_name="${repository_uri#*/}"
  local digest
  digest="$(
    aws ecr describe-images \
      --region "${AWS_REGION}" \
      --repository-name "${repository_name}" \
      --image-ids "imageTag=${RELEASE_SHA}" \
      --query 'imageDetails[0].imageDigest' \
      --output text
  )"
  if [[ ! "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo "ECR did not return a valid digest for ${repository_name}:${RELEASE_SHA}." >&2
    return 1
  fi
  printf '%s@%s' "${repository_uri}" "${digest}"
}

web_image="$(resolve_image_digest "${WEB_REPOSITORY_URI}")"
worker_image="$(resolve_image_digest "${WORKER_REPOSITORY_URI}")"

cat >"${new_image_env}" <<EOF
NEXUS_WEB_IMAGE=${web_image}
NEXUS_WORKER_IMAGE=${worker_image}
EOF

install -m 0644 "${RELEASE_COMPOSE}" "${ACTIVE_COMPOSE}"
install -m 0644 "${RELEASE_CADDY}" "${ACTIVE_CADDY}"
install -m 0600 "${new_runtime_env}" "${ACTIVE_ENV}"
install -m 0600 "${new_image_env}" "${ACTIVE_IMAGES}"

deploy_active_release

printf '%s\n' "${RELEASE_SHA}" >"${NEXUS_ROOT}/current-release"
chmod 0644 "${NEXUS_ROOT}/current-release"
docker image prune --force --filter "until=168h" >/dev/null

trap - ERR
echo "Nexus release ${RELEASE_SHA} is healthy."
