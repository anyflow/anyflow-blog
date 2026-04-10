# anyflow-blog

anyflow.net public site를 대체하기 위한 11ty 기반 정적 블로그.

## Quick Start

    # 설치 (cert-manager 필요)
    make anyflow-blog-c

    # 제거
    make anyflow-blog-d

    # 재배포
    make anyflow-blog-r

## 개발

    cd apps/anyflow-blog
    npm ci
    npx eleventy --serve    # 로컬 dev server

    # 컨테이너 빌드 후 배포
    docker build -t ghcr.io/anyflow/anyflow-blog:latest .
    kind load docker-image ghcr.io/anyflow/anyflow-blog:latest --name my-cluster
    kubectl rollout restart deployment/anyflow-blog -n service

## 문서

- AGENTS.md: 작업 컨텍스트 및 현황
- GOAL.md: 최종 목표와 완성 기준
- PLAN.md: 구현 계획과 단계별 실행 기준
- ARCHITECTURE.md: 시스템 경계와 데이터 흐름
- CONTENT_CONTRACT.md: 콘텐츠/라우팅/산출물 계약
- OPERATIONS.md: 운영 및 검증 절차
