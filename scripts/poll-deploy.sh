#!/bin/sh
set -eu
umask 077
work_dir=${DEPLOY_DATA_DIR:-/data}
mkdir -p "$work_dir"
checkout=$(mktemp -d "$work_dir/checkout.XXXXXX")
trap 'rm -rf "$checkout"' EXIT
trap 'exit 1' HUP INT TERM

git -c maintenance.autoDetach=false -c gc.autoDetach=false clone --depth 1 --no-tags --branch master --single-branch git@github.com:anyflow/anyflow-blog.git "$checkout"
cd "$checkout"
echo "Deploying $(git rev-parse HEAD)"
make deploy
echo "Deployment completed"
