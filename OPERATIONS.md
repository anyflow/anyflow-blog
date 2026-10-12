# OPERATIONS

## 현재 단계

대표 UI와 콘텐츠 5a9e126을 blog.anyflow.net에 게시한다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 코드 저장소는 비공개 git@github.com:anyflow/anyflow-blog.git이다.

## 미리보기

```sh
make sync
npm test
BLOG_OUTPUT_DIR=_preview npm run build
sudo rc-service anyflow-blog-preview status
```

새 콘텐츠 원본은 비공개 `anyflow/blog` 저장소 루트다. 현재 Mac의 SSH 터널 미리보기는 `http://127.0.0.1:8765/`이며 운영 `blog.anyflow.net`과 분리한다. 빌드는 성공한 결과만 전환하고 이전 생성 결과 한 개를 `.cache/previous-build`에 보관한다.

## 빌드/배포

### 원샷 설치
    make anyflow-blog-c

수행 순서: cert-manager 확인 -> Gateway 적용 -> 인증서 발급 대기 -> docker build -> kind load -> deployment/service/httproute apply -> rollout wait

### 원샷 제거
    make anyflow-blog-d

### 기존 배포 갱신
    cd apps/anyflow-blog
    make load deploy

manifest의 고유 이미지 태그로 빌드·kind 적재 후 삭제 없이 rollout한다. root anyflow-blog-r은 삭제를 포함하므로 일반 배포에는 사용하지 않는다.

### 수동 빌드/배포 (개발 중)
    cd apps/anyflow-blog
    make load deploy

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

후속 작업:
- 전체 콘텐츠 검수와 누락 글·링크 정리
- GitHub Actions와 self-hosted runner의 공유 볼륨 게시 구성
- Disqus 댓글·좋아요 보존 확인
- 전체 검증과 별도 승인 후 anyflow.net 전환

이 문서는 단계가 진행될 때마다 갱신한다.

## 현재 검증 제약

정적 빌드와 깨끗한 의존성 설치는 검증했다. 최종 배포 결과는 아래에 기록한다. 호스트 DNS·기본 라우트는 유지했고 재부팅으로 없어진 기존 80·443 NodePort 포워딩만 복구했다.

## 시각 자산 미리보기

시각 자산과 글별 속성은 iCloud blog vault에 저장한다. 현재 `.cache/blog`에는 GitHub의 5a9e126을 깨끗하게 clone해서 사용한다. 시각 자산 270개와 작성 속성·갤러리 설정을 포함한다. 이전 작업 사본은 `.cache/blog-before-publish-20261012`에 보관한다. `_assets/visuals/manifest.json`에 모든 원본 페이지 ID와 주소를 보관하며 slug가 없는 글 8개도 UUID 주소로 대응했다.

## 미리보기 상시 실행

alpine의 OpenRC `anyflow-blog-preview`가 127.0.0.1:18765에서 `_preview`를 제공한다. 소스 설정은 `scripts/preview.openrc`, 설치 위치는 `/etc/init.d/anyflow-blog-preview`다. default runlevel에 등록하고 supervise-daemon으로 자동 재시작한다. 서비스 사용자 권한은 anyflow다.

Mac의 LaunchAgent `net.anyflow.blog-preview-tunnel`이 127.0.0.1:8765를 alpine의 127.0.0.1:18765로 연결한다. 사용자 로그인 시 자동 시작하며 SSH가 종료되면 자동 복구한다. 설정은 `~/Library/LaunchAgents/net.anyflow.blog-preview-tunnel.plist`, SSH 설정과 로그는 `~/Library/Application Support/anyflow-blog-preview/`에 둔다. 공개 Gateway·운영 블로그에는 적용하지 않는다.

```sh
# alpine
sudo rc-service anyflow-blog-preview status
sudo rc-service anyflow-blog-preview restart
# Mac
launchctl print gui/$(id -u)/net.anyflow.blog-preview-tunnel
```

검증에서 Python worker와 SSH 터널을 종료한 뒤 새 PID로 자동 복구되고 Mac 미리보기 HTTP 200이 돌아오는 것을 확인했다. 실제 호스트 재부팅 후 OpenRC 자동 시작과 Mac 미리보기 HTTP 200도 확인했다. 상시 서버 실행 중에는 `npm run dev`로 같은 포트를 추가 실행하지 않고 `BLOG_OUTPUT_DIR=_preview npm run build`만 수행한다.

Obsidian의 갤러리 선택은 글 속성과 편집기 표시를 갱신한다. 웹 미리보기는 콘텐츠 사본 반영과 재빌드가 필요하며, commit 이후 자동 게시 연결은 후속 단계다.

## 이미지 버전과 복구

현재 태그는 ghcr.io/anyflow/anyflow-blog:ui-20261012-5a9e126-r2이다. manifest의 태그를 Makefile에서 읽으며 이미지 label에 코드·콘텐츠 commit을 기록한다. GHCR 업로드 없이 kind에 적재한 이미지를 사용한다. 다음 릴리스에는 새 태그를 사용한다.

이전 latest 이미지와 Deployment 이력은 유지한다. 장애 시 kubectl -n service rollout undo deployment/anyflow-blog로 이전 이력을 복구하고 manifest도 대응 버전으로 되돌린다. 서버 재부팅 후 80·443 포워딩이 없어지면 루트 make port_forward로 기존 NodePort 경로를 복구한다. CSS·JS URL에는 파일 해시를 붙여 변경된 파일을 다시 읽도록 한다.

HTML과 첨부에 Cache-Control: no-cache를 반환해 브라우저가 변경 여부를 재검증하도록 한다. 기존 방문자의 이전 HTML 캐시는 한 번 새로고침하면 갱신된다.

## 2026-10-12 배포 검증

blog.anyflow.net 배포와 실제 응답 검증을 완료했다. 기존 anyflow.net은 Oopy 기반 호스팅을 유지하며 해당 DNS·라우팅은 변경하지 않았다. public-gateway의 spec도 배포 전후 일치한다.

| 항목 | 결과 |
| --- | --- |
| 콘텐츠 | anyflow/blog main 5a9e126, 깨끗한 작업 사본 |
| 이미지 코드 | anyflow/anyflow-blog master 577b7c7, 마지막 캐시 헤더 변경 포함 |
| 최종 이미지 | ghcr.io/anyflow/anyflow-blog:ui-20261012-5a9e126-r2 |
| 이미지 ID | sha256:850123120e2e42333b1c5f25872cbe3d7a7fc8e3e4540a1c6c9963c454da10e8 |
| 런타임 | service/anyflow-blog, Ready 1/1, 재시작 0, Pod imageID 일치 |
| 단위·회귀 테스트 | 7/7 통과, 빈 콘텐츠 실패 시 기존 출력 보존 포함 |
| 정적 생성 | 글 394개·홈 1개, 참조 첨부 886개, 기존 미해결 참조 7개 |
| 격리 nginx 검사 | 설정 검사 통과, 32Mi 제한에서 OOM 없음, 사용량 15.74MiB |
| 실제 HTTPS | TLS 검증, 대표 페이지 3개 GET 200, 글·홈 395개 HEAD 200, 이미지 URL 881개 HEAD 200 |
| 비공개 경로 | 없는 글·.git/config·.mcp.json·blog.md·manifest.json 5개 모두 404 |
| 브라우저 | 원본과 PC·모바일·라이트·다크 12쌍 대조, 제목·속성·목차·색상·커버 위치 일치, 가로 넘침 0 |
| Markdown 표현 | 대표 사진·캡션·글 링크·코드·인용·목차 이동 확인, 공개 AI 글에서 Mermaid SVG 3개 확인 |
| 파일 일치 | 실행 Pod의 index.html·CSS·JS SHA-256이 검증한 정적 출력과 일치 |

전체 Docker 빌드는 코드 91eac08에서 성공했다. 캐시 헤더만 바꾼 577b7c7의 재빌드는 Docker Hub 연결 시간 초과로 실패했다. 이 마지막 변경은 검증된 런타임 이미지 ui-20261012-5a9e126을 기반으로 nginx.conf만 교체하고 nginx -t를 통과한 뒤 새 r2 태그로 적재했다. HTML·CSS·JS·콘텐츠는 같은 바이트를 유지했다. 이미지 label의 코드 577b7c7과 콘텐츠 5a9e126을 런타임에서 대조했다.

이번 패치의 생성 문맥과 로그는 .cache/revalidate-image, .cache/release-r2-cached-build.log에 보관한다. 서버 재부팅 후 make port_forward가 필요할 수 있으며 이미지·콘텐츠·문서 commit과 GitHub Actions 자동 게시 완료를 구분한다. 자동 게시, 전체 콘텐츠 검수, 최신 글 3개의 게시 속성·본문 보완, 검색·RSS·sitemap·UUID·댓글은 후속 단계다.
