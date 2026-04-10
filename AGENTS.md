# AGENTS.md

이 문서는 apps/anyflow-blog 하위 작업에만 적용된다.
상위 AGENTS 지침을 따르되, 이 범위에서는 아래 원칙을 추가로 적용한다.

## 프로젝트 현황

- 11ty(Eleventy) 기반 정적 블로그. blog.anyflow.net으로 서빙 중.
- 현재 1차 범위: representative page subset으로 표면 재현 검증 단계.
- 대표 글 2개(AI Agents Platform, Zero Trust Architecture via Istio)가 수집/변환 완료.
- 홈, 상세 페이지가 동작하며 CSS/JS/다크모드 포함.

## 기술 스택

- 생성기: 11ty v3 (Node.js)
- 런타임: nginx:alpine (단일 컨테이너 이미지)
- 이미지: ghcr.io/anyflow/anyflow-blog:latest
- 빌드: multi-stage Dockerfile (node:22-alpine -> nginx:alpine)
- 배포: kind 클러스터, make anyflow-blog-c / make anyflow-blog-d
- 인증서: cert-manager, Let Encrypt HTTP-01
- ingress: Gateway API HTTPRoute, blog.anyflow.net

## 프로젝트 구조

    apps/anyflow-blog/
    +-- .eleventy.js          # 11ty 설정
    +-- Dockerfile            # multi-stage build
    +-- .dockerignore
    +-- package.json
    +-- src/
    |   +-- _includes/        # 템플릿 (base.njk, post.njk)
    |   +-- _data/            # site.json (사이트 메타, 카테고리)
    |   +-- css/style.css     # 자체 CSS
    |   +-- js/main.js        # 다크모드 등
    |   +-- posts/            # Markdown 글 + posts.json (layout/tags)
    |   +-- index.njk         # 홈페이지
    +-- deployment/
    |   +-- deployment.yaml   # k8s Deployment (단일 컨테이너)
    |   +-- service.yaml      # k8s Service
    |   +-- httproute.yaml    # Gateway API HTTPRoute (blog.anyflow.net)
    |   +-- nginx.conf        # nginx 설정
    +-- _site/                # 빌드 출력 (gitignore 대상)
    +-- 문서들 (GOAL, PLAN, ARCHITECTURE, OPERATIONS, CONTENT_CONTRACT, README)

## 관련 파일 (apps/anyflow-blog 외부)

- Makefile: anyflow-blog-c, anyflow-blog-d, anyflow-blog-r 타겟
- cluster/public-gateway.yaml: blog.anyflow.net listener (http + https)
- certificate/blog-anyflow-net.yaml: Let Encrypt 인증서

## 빌드/배포 흐름

    docker build -> kind load -> kubectl apply deployment/service/httproute -> rollout

전체 원샷: make anyflow-blog-c (cert-manager 의존)
삭제: make anyflow-blog-d

## 작업 원칙

- 최종 목표는 anyflow.net과 구분 불가한 표면 재현. 중간 산출물보다 결과 우선.
- 의견/결정사항은 하나씩 보여주며 사용자 확인을 받을 것.
- subagent를 적극 활용하되, 서로 충돌하는 파일을 동시에 수정하지 않을 것.
- legacy UUID는 이관 대상이 아님. redirect도 만들지 않음.
- 카테고리 목록은 정적 페이지로 별도 생성 (홈 JS 필터링 아님).

## 1차에서 아직 안 한 것

- 카테고리 목록 페이지 생성
- 기준 사이트와 나란히 표면 비교 (브라우저 확인)
- RSS, sitemap, search index
- 모바일 반응형 세부 조정
- 다크모드 색상 세부 조정

## 완료 판단

- GOAL.md 기준으로 gap review 수행.
- 기능, 정보 구조, 탐색 흐름, 레이아웃, 타이포그래피, 색상, 인터랙션 관점에서 목표 충족 여부 점검.
