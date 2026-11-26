VAULT_REPO   := git@github.com:anyflow/blog.git
VAULT_DIR    := $(CURDIR)/.cache/blog

.PHONY: sync site hooks

sync:
	@if [ -d "$(VAULT_DIR)/.git" ]; then \
		test "$$(git -C "$(VAULT_DIR)" remote get-url origin)" = "$(VAULT_REPO)" || { echo "Unexpected content remote"; exit 1; }; \
		git -C "$(VAULT_DIR)" pull --ff-only; \
	else \
		mkdir -p "$$(dirname "$(VAULT_DIR)")"; \
		git clone --depth 1 $(VAULT_REPO) "$(VAULT_DIR)"; \
	fi
	@echo "Content revision: $$(git -C "$(VAULT_DIR)" rev-parse --short HEAD)"

site: sync
	BLOG_CONTENT_DIR="$(VAULT_DIR)" npm run build

hooks:
	@case "$$(git config --get core.hooksPath || true)" in ""|.githooks) ;; *) echo "기존 hooksPath가 있어 변경하지 않는다." >&2; exit 1 ;; esac
	git config --local core.hooksPath .githooks
