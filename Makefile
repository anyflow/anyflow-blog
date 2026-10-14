VAULT_REPO   := git@github.com:anyflow/blog.git
VAULT_DIR    := $(CURDIR)/.cache/blog
NAMESPACE    := service
KUBE_CONTEXT := kind-my-cluster

.PHONY: sync site deploy create delete recreate

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

deploy:
	kubectl --context=$(KUBE_CONTEXT) get secret anyflow-blog-registry -n $(NAMESPACE) >/dev/null
	kubectl --context=$(KUBE_CONTEXT) get secret anyflow-blog-comments -n $(NAMESPACE) >/dev/null
	kubectl --context=$(KUBE_CONTEXT) apply -f deployment/services.yaml
	kubectl --context=$(KUBE_CONTEXT) apply -f deployment/endpointslices.yaml
	kubectl --context=$(KUBE_CONTEXT) apply -f deployment/deployments.yaml
	kubectl --context=$(KUBE_CONTEXT) apply -f deployment/httproute.yaml
	kubectl --context=$(KUBE_CONTEXT) rollout status deployment/anyflow-blog-comments -n $(NAMESPACE) --timeout=120s
	kubectl --context=$(KUBE_CONTEXT) rollout status deployment/anyflow-blog -n $(NAMESPACE) --timeout=300s

create: deploy

delete:
	kubectl --context=$(KUBE_CONTEXT) delete -f deployment/httproute.yaml || true
	kubectl --context=$(KUBE_CONTEXT) delete deployment/anyflow-blog -n $(NAMESPACE) || true
	kubectl --context=$(KUBE_CONTEXT) delete service/anyflow-blog -n $(NAMESPACE) || true

recreate: delete create
