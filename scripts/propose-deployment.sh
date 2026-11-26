#!/usr/bin/env bash
set -euo pipefail

git fetch origin main --tags
release=$(node scripts/release-version.js published origin/main)
tag=$(jq -er '.tag' <<< "$release")
BLOG_APP_VERSION=$(jq -er '.version' <<< "$release")
export BLOG_APP_VERSION
cd .cache/home-platform
branch=automation/blog-images
repo=anyflow/home-platform
file=apps/blog-app/deployment.yaml

python3 scripts/update_blog_images.py
git diff --check
if git diff --quiet -- "$file"; then
  exit 0
fi

head=$(git ls-remote --heads origin "refs/heads/$branch" | cut -f1)
if [[ -n "$head" ]]; then
  git fetch origin "$head"
fi
if [[ -z "$head" ]] || ! git diff --quiet "$head" -- "$file"; then
  git config user.name github-actions[bot]
  git config user.email 41898282+github-actions[bot]@users.noreply.github.com
  git add "$file"
  git commit -m "chore: deploy blog-app $tag"
  git push --force-with-lease="refs/heads/$branch:$head" origin "HEAD:refs/heads/$branch"
fi

pr=$(gh pr list --repo "$repo" --base main --head "$branch" --json number --jq '.[0].number')
if [[ -z "$pr" ]]; then
  gh pr create --repo "$repo" --base main --head "$branch" \
    --title "chore: update blog image versions" \
    --body "Deploy both images at the version from the [blog-app release tags](https://github.com/anyflow/blog-app/tags). The commit identifies the corresponding release tag."
fi
