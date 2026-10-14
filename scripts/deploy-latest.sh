#!/bin/sh
set -eu
umask 077
: "${DEPLOY_CHECKOUT:?DEPLOY_CHECKOUT is required}"
: "${DEPLOY_STATE_FILE:?DEPLOY_STATE_FILE is required}"
exec >>"${DEPLOY_STATE_FILE}.log" 2>&1
exec 9>"${DEPLOY_STATE_FILE}.lock"
flock 9
# Only this dedicated checkout and fixed repository can supply deployment commands.
cd "$DEPLOY_CHECKOUT"
origin=$(git remote get-url origin)
case "$origin" in
  git@github.com:anyflow/anyflow-blog.git|https://github.com/anyflow/anyflow-blog.git) ;;
  *) echo "Unexpected deployment origin" >&2; exit 1 ;;
esac
[ "$(git branch --show-current)" = master ] || { echo "Deployment checkout must use master" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Deployment checkout is dirty" >&2; exit 1; }
git -c maintenance.autoDetach=false -c gc.autoDetach=false fetch --no-tags origin master
git merge --ff-only origin/master
exec make deploy
