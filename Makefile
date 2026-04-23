VAULT_REPO   := git@github.com:anyflow/obsidian-vault.git
VAULT_DIR    := /tmp/obsidian-vault
POSTS_DIR    := src/posts
IMAGE        := ghcr.io/anyflow/anyflow-blog:latest
CLUSTER_NAME := my-cluster
NAMESPACE    := service

.PHONY: sync build load deploy create delete recreate

sync:
	@if [ -d "$(VAULT_DIR)/.git" ]; then \
		git -C $(VAULT_DIR) pull --ff-only; \
	else \
		git clone --depth 1 $(VAULT_REPO) $(VAULT_DIR); \
	fi
	rm -rf $(POSTS_DIR)/*/
	cp -r $(VAULT_DIR)/blog/* $(POSTS_DIR)/
	rm -rf $(POSTS_DIR)/_legacy_notion_import $(POSTS_DIR)/_audit
	@echo "Synced $$(find $(POSTS_DIR) -name '*.md' | wc -l) posts"

build: sync
	docker build -t $(IMAGE) .

load: build
	kind load docker-image $(IMAGE) --name $(CLUSTER_NAME)

deploy:
	kubectl apply -f deployment/service.yaml
	kubectl apply -f deployment/deployment.yaml
	kubectl rollout restart deployment/anyflow-blog -n $(NAMESPACE)
	kubectl apply -f deployment/httproute.yaml
	kubectl rollout status deployment/anyflow-blog -n $(NAMESPACE) --timeout=300s

create: load deploy

delete:
	kubectl delete -f deployment/httproute.yaml || true
	kubectl delete -f deployment/deployment.yaml || true
	kubectl delete -f deployment/service.yaml || true

recreate: delete create
