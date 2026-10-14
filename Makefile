VAULT_REPO   := git@github.com:anyflow/blog.git
VAULT_DIR    := $(CURDIR)/.cache/blog
IMAGE        := $(shell awk '/^  name:/ {name=$$2} $$1=="image:" && name=="anyflow-blog" {print $$2}' deployment/deployments.yaml)
COMMENTS_IMAGE := $(shell awk '/^  name:/ {name=$$2} $$1=="image:" && name=="anyflow-blog-comments" {print $$2}' deployment/deployments.yaml)
CLUSTER_NAME := my-cluster
NAMESPACE    := service

.PHONY: sync site build load deploy create delete recreate

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

build: sync
	docker build --label org.opencontainers.image.revision=$$(git rev-parse HEAD) --label net.anyflow.blog.content-revision=$$(git -C "$(VAULT_DIR)" rev-parse HEAD) -t $(IMAGE) .
	docker build --target comments-api --label org.opencontainers.image.revision=$$(git rev-parse HEAD) -t $(COMMENTS_IMAGE) .

load: build
	kind load docker-image $(IMAGE) $(COMMENTS_IMAGE) --name $(CLUSTER_NAME)

deploy:
	kubectl get secret anyflow-blog-comments -n $(NAMESPACE) >/dev/null
	kubectl apply -f deployment/services.yaml
	kubectl apply -f deployment/deployments.yaml
	kubectl apply -f deployment/httproute.yaml
	kubectl rollout status deployment/anyflow-blog-comments -n $(NAMESPACE) --timeout=120s
	kubectl rollout status deployment/anyflow-blog -n $(NAMESPACE) --timeout=300s

create: load deploy

delete:
	kubectl delete -f deployment/httproute.yaml || true
	kubectl delete deployment/anyflow-blog -n $(NAMESPACE) || true
	kubectl delete service/anyflow-blog -n $(NAMESPACE) || true

recreate: delete create
