#!/bin/sh
set -eu
umask 077
state_dir=${DEPLOY_DATA_DIR:-/data}
mkdir -p "$state_dir"
exec 9>"$state_dir/deploy.lock"
flock -n 9 || { echo "Deployment is already running"; exit 0; }
checkout="$state_dir/checkout"
if [ ! -d "$checkout/.git" ]; then
  [ ! -e "$checkout" ] || { echo "Incomplete deployment checkout" >&2; exit 1; }
  # Clone in a temporary directory so an interrupted clone can retry next minute.
  temporary=$(mktemp -d "$state_dir/clone.XXXXXX")
  trap 'rm -rf "$temporary"' EXIT
  trap 'exit 1' HUP INT TERM
  git -c maintenance.autoDetach=false -c gc.autoDetach=false clone --no-tags --branch master --single-branch git@github.com:anyflow/anyflow-blog.git "$temporary"
  mv "$temporary" "$checkout"
  trap - EXIT HUP INT TERM
fi
cd "$checkout"
[ "$(git remote get-url origin)" = git@github.com:anyflow/anyflow-blog.git ] || { echo "Unexpected deployment remote" >&2; exit 1; }
[ "$(git branch --show-current)" = master ] || { echo "Deployment branch must be master" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Deployment checkout is dirty" >&2; exit 1; }
git -c maintenance.autoDetach=false -c gc.autoDetach=false fetch --no-tags origin master
git merge --ff-only origin/master
tree=$(git rev-parse HEAD:deployment)
previous=$(cat "$state_dir/last-success" 2>/dev/null || true)
if [ "$tree" = "$previous" ]; then
  echo "Deployment unchanged: $tree"
  exit 0
fi
echo "Deploying $(git rev-parse HEAD), deployment tree $tree"
make deploy
printf '%s\n' "$tree" >"$state_dir/last-success.tmp"
mv "$state_dir/last-success.tmp" "$state_dir/last-success"
echo "Deployment completed: $tree"
