VAULT_REPO   := git@github.com:anyflow/blog.git
VAULT_DIR    := $(CURDIR)/.cache/blog
NAMESPACE    := service
KUBE_CONTEXT ?= $(if $(KUBERNETES_SERVICE_HOST),,kind-my-cluster)
KUBECTL      := kubectl $(if $(KUBE_CONTEXT),--context=$(KUBE_CONTEXT))

.PHONY: sync site deploy deploy-automation create delete recreate

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
ifeq ($(KUBERNETES_SERVICE_HOST),)
	$(KUBECTL) get secret anyflow-blog-registry -n $(NAMESPACE) >/dev/null
	$(KUBECTL) get secret anyflow-blog-comments -n $(NAMESPACE) >/dev/null
endif
	$(KUBECTL) apply -f deployment/services.yaml
	$(KUBECTL) apply -f deployment/deployments.yaml
	$(KUBECTL) apply -f deployment/httproute.yaml
	$(KUBECTL) apply -f deployment/agentgatewaypolicy.yaml
	$(KUBECTL) apply -f deployment/cronjob.yaml
	$(KUBECTL) rollout status deployment/anyflow-blog-comments -n $(NAMESPACE) --timeout=120s
	$(KUBECTL) rollout status deployment/anyflow-blog -n $(NAMESPACE) --timeout=300s

deploy-automation:
	$(KUBECTL) get secret anyflow-blog-registry -n $(NAMESPACE) >/dev/null
	$(KUBECTL) get secret anyflow-blog-deploy-git -n $(NAMESPACE) >/dev/null
	$(KUBECTL) apply -f deployment/serviceaccounts.yaml
	$(KUBECTL) apply -f deployment/roles.yaml
	$(KUBECTL) apply -f deployment/rolebindings.yaml
	$(KUBECTL) apply -f deployment/persistentvolumeclaims.yaml
	$(KUBECTL) apply -f deployment/agentgatewaypolicy.yaml
	$(KUBECTL) apply -f deployment/cronjob.yaml

create: deploy-automation deploy

delete:
	$(KUBECTL) patch cronjob anyflow-blog-deploy -n $(NAMESPACE) --type=merge -p '{"spec":{"suspend":true}}' || true
	$(KUBECTL) delete -f deployment/agentgatewaypolicy.yaml || true
	$(KUBECTL) delete -f deployment/httproute.yaml || true
	$(KUBECTL) delete deployment/anyflow-blog -n $(NAMESPACE) || true
	$(KUBECTL) delete service/anyflow-blog -n $(NAMESPACE) || true

recreate: delete create
