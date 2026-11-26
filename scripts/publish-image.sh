#!/usr/bin/env bash
set -euo pipefail

image="ghcr.io/anyflow/$1"
version=$2
digest=$3
source_sha=$4
content_sha=$5
[[ -n "$version" ]] || exit 0
[[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]
tag="$image:$version"

if existing=$(docker buildx imagetools inspect "$tag" --format '{{.Manifest.Digest}}' 2>&1); then
  [[ "$existing" =~ ^sha256:[a-f0-9]{64}$ ]]
  if [[ "$existing" == "$digest" ]]; then
    printf '%s\n' "$existing"
    exit 0
  fi
  # A retry can rebuild an equivalent image with a different manifest digest.
  # Reuse the published tag only when its pinned inputs match this release.
  published="$image@$existing"
  docker pull --platform linux/amd64 "$published" >&2
  actual_source=$(docker image inspect "$published" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  actual_content=$(docker image inspect "$published" --format '{{index .Config.Labels "net.anyflow.blog.content-revision"}}')
  if [[ "$actual_source" != "$source_sha" || ( -n "$content_sha" && "$actual_content" != "$content_sha" ) ]]; then
    echo "Version tag already exists for different inputs: $tag" >&2
    exit 1
  fi
  printf '%s\n' "$existing"
  exit 0
fi

if ! printf '%s\n' "$existing" | grep -Eiq 'not found|manifest unknown'; then
  printf '%s\n' "$existing" >&2
  exit 1
fi
docker buildx imagetools create --prefer-index=false --tag "$tag" "$image@$digest" >&2
actual=$(docker buildx imagetools inspect "$tag" --format '{{.Manifest.Digest}}')
[[ "$actual" == "$digest" ]]
printf '%s\n' "$actual"
