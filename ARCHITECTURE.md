# ARCHITECTURE

## 목표

- 현재 anyflow.net public site(Notion + Oopy 기반)를 11ty 기반 정적 사이트로 대체한다.
- 외부 공개 계약의 핵심 키는 permalink다.
- 배포는 my-cluster의 기존 운영 구조 안에 편입한다.
- 댓글은 self-hosted Remark42를 분리 가능한 구성요소로 둔다.

## 시스템 구성

    Live anyflow.net --수동 수집--> Markdown content --> 11ty Build --> nginx container image
    GitHub Actions --> Self-hosted Runner --> docker build/push --> kubectl apply
    User Browser <--> blog.anyflow.net (Gateway API) <--> anyflow-blog pod (nginx)
    Remark42 (후속)

## 현재 구현된 구조

    Markdown (src/posts/*.md)
      --> 11ty build (Dockerfile stage 1: node:22-alpine)
      --> static output (_site/)
      --> nginx container (Dockerfile stage 2: nginx:alpine)
      --> ghcr.io/anyflow/anyflow-blog:latest
      --> kind load --> k8s Deployment
      --> Gateway API HTTPRoute (blog.anyflow.net)
      --> Let Encrypt TLS (cert-manager)

## 책임 경계

### 콘텐츠 계층
- Markdown과 frontmatter를 통해 공개 계약을 표현한다.
- 내부 폴더 구조는 작성 편의를 위한 것이며 외부 URL을 직접 결정하지 않는다.

### 생성 계층
- 11ty가 콘텐츠를 읽고 정적 산출물을 만든다.
- 홈, 상세, 카테고리/섹션 목록, 검색 인덱스, RSS, sitemap, 정적 자산을 생성한다.

### 운영 계층
- nginx가 생성된 정적 파일만 서빙한다.
- 단일 컨테이너 이미지로 패키징 (11ty 빌드 + nginx 서빙).
- Remark42는 페이지 URL 기준으로 연결한다 (후속).

### 자동화 계층
- 현재: make anyflow-blog-c로 로컬 빌드 + kind 배포.
- 후속: GitHub Actions가 publish 파이프라인을 트리거. self-hosted runner가 build, push, deploy 담당.

## 핵심 원칙

- 외부 공개 URL은 항상 clean URL이 기준이다.
- legacy UUID 경로는 이관 대상이 아니다.
- 시스템 안정성은 파일 위치가 아니라 page 계약에 둔다.
- 생성기 내부 구현은 변경 가능하지만, page 계약과 외부 URL 계약은 유지한다.
