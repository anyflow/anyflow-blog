# OPERATIONS

## 현재 단계

1차: representative page subset으로 표면 재현 검증.

## 빌드/배포

### 원샷 설치
    make anyflow-blog-c

수행 순서: cert-manager 확인 -> Gateway 적용 -> 인증서 발급 대기 -> docker build -> kind load -> deployment/service/httproute apply -> rollout wait

### 원샷 제거
    make anyflow-blog-d

### 재배포 (삭제 후 재생성)
    make anyflow-blog-r

### 수동 빌드/배포 (개발 중)
    cd apps/anyflow-blog
    docker build -t ghcr.io/anyflow/anyflow-blog:latest .
    kind load docker-image ghcr.io/anyflow/anyflow-blog:latest --name my-cluster
    kubectl rollout restart deployment/anyflow-blog -n service

## 접근

- HTTPS: https://blog.anyflow.net/
- DNS: blog.anyflow.net -> anyflow.iptime.org -> 222.108.188.34
- TLS: Let Encrypt, cert-manager HTTP-01 challenge
- Gateway: public-gateway (cluster namespace), blog.anyflow.net listener
- HTTPRoute: anyflow-blog (service namespace)

## 검증

- 기준 사이트와 나란히 눈으로 비교
- 체크 항목: 내부 링크, 이미지 로드, 반응형, 다크모드, 검색, OG metadata

## 후속 단계

1차 통과 후:
- 전체 corpus 이관
- GHCR push 자동화 (GitHub Actions + self-hosted runner)
- Remark42 연결
- production cutover

이 문서는 단계가 진행될 때마다 갱신한다.
