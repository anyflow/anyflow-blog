# AGENTS.md

이 문서는 `apps/anyflow-blog` nested repo 작업에 적용된다.
상위 repo 지침을 따르되, 이 범위에서는 아래 현재 상태와 작업 원칙을 추가로 적용한다.

## 현재 운영 상태

- 11ty(Eleventy) 기반 정적 블로그이며 현재 `blog.anyflow.net`으로 외부 노출 중이다.
- 현재 클러스터 기준 런타임 상태:
  - namespace `service`에 `anyflow-blog` `Deployment/Service`가 떠 있다.
  - `HTTPrRoute`는 `blog.anyflow.net` host로 연결되어 있다.
  - `cluster` namespace의 `blog-anyflow-net` certificate는 `Ready=True`다.
- 콘텐츠 소스는 현재 `obsidian-vault`의 `blog/` 디렉토리에서 동기화하는 방향으로 정리 중이다. 새 스레드는 먼저 `git status`와 `Makefile`의 `sync` 흐름을 보고 현재 콘텐츠 반영 방식이 무엇인지 확인해야 한다.

## 현재 작업트리 관찰 포인트

- 핵심 관찰 포인트:
  - `.eleventy.js`는 `src/posts`를 그대로 passthrough copy하고 Markdown 렌더 경로를 단순화했다.
  - repo-local `Makefile`은 `obsidian-vault` -> `src/posts/` 동기화 흐름을 제공한다.
  - `.eleventyignore`는 `src/posts/**/*.html`을 무시해 원문 HTML 찌꺼기가 빌드 입력으로 섞이지 않게 한다.
  - `src/posts/` 아래 개별 글 경로는 로컬 작업공간 성격으로 운용 중이다.
- `src/posts/`는 `.gitignore`에 등록되어 있으므로, 이 경로에서 새로 만든 로컬 콘텐츠는 기본적으로 Git 추적 대상이 아니다.
- 현재 트래킹 기준의 핵심 배포 자산은 `deployment/` 아래 파일들과 루트 빌드 설정들이다.

## 기술 스택

- 생성기: 11ty v3 (Node.js)
- 런타임: `nginx:alpine` 단일 컨테이너
- 이미지: `ghcr.io/anyflow/anyflow-blog:latest`
- 빌드: multi-stage Dockerfile (`node:22-alpine` -> `nginx:alpine`)
- 배포: 루트 `Makefile`의 `anyflow-blog-c`, `anyflow-blog-d`, `anyflow-blog-r`
- ingress: Gateway API `HTTPRoute`, host `blog.anyflow.net`
- 인증서: cert-manager / `certificate/blog-anyflow-net.yaml`

## 프로젝트 구조

- 핵심 설정/빌드 파일:
  - `.eleventy.js`
  - `.eleventyignore`
  - `Makefile`
  - `Dockerfile`
  - `package.json`
  - `deployment/`
- 콘텐츠/템플릿 축:
  - `src/_includes/`
  - `src/_data/`
  - `src/css/`
  - `src/js/`
  - `src/posts/` (현재 로컬 작업공간 성격, ignore 대상)
- 참고 문서:
  - `GOAL.md`
  - `PLAN.md`
  - `ARCHITECTURE.md`
  - `OPERATIONS.md`
  - `CONTENT_CONTRACT.md`

## 빌드/배포 흐름

- repo-local `Makefile`의 `sync`는 `obsidian-vault`의 `blog/` 디렉토리를 `src/posts/`로 복사하고 불필요한 보조 디렉토리를 제거한다.
- 배포 경로는 다음 순서를 따른다.
  1. `sync`로 콘텐츠 동기화
  2. 정적 사이트 빌드
  3. Docker 이미지 빌드
  4. kind 클러스터로 이미지 load
  5. `deployment.yaml`, `service.yaml`, `httproute.yaml` 적용
- 루트 repo에서 전체 진입은 다음 타깃을 사용한다.
  - `make anyflow-blog-c`
  - `make anyflow-blog-d`
  - `make anyflow-blog-r`

## 작업 원칙

- 최종 목표는 `anyflow.net`과 구분이 어려운 표면 재현이다.
- nested repo 작업은 이 repo의 Git 이력 안에서만 정리한다.
- `AGENTS.md`는 handoff용으로 유지하되 `.gitignore`에도 등록한다. 이미 tracked 상태라 계속 업데이트 가능하다.
- `src/posts/`는 `.gitignore` 대상이므로, 콘텐츠 자체보다 동기화 규칙과 빌드/배포 자산을 우선 검토한다.
- UI/콘텐츠 정리는 배포 자산(`deployment/*`)과 실제 노출 상태(`blog.anyflow.net`)를 같이 보고 판단한다.

## 검증 기준

- `git status`로 현재 작업트리 변경 축 확인
- `npm run build` 또는 동등한 11ty 빌드 통과
- 배포 변경 시 루트 `make anyflow-blog-c` 또는 동등 흐름으로 재배포
- `kubectl get deploy,svc -n service anyflow-blog`
- `kubectl get httproute -n service anyflow-blog`
- `kubectl get certificate -n cluster blog-anyflow-net`
- 필요 시 실제 `blog.anyflow.net` 응답 확인

## 주의

- 이 repo는 nested git repository다. 상위 `my-cluster` repo와 별도 이력을 가진다.
- 현재 content migration 흔적이 남아 있으므로, 의도하지 않은 파일까지 같이 commit하지 않도록 stage 범위를 제한할 것.
