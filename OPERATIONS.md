# OPERATIONS

## 현재 단계

2026-10-14 사용자 요청으로 표시·작성 개선·OG·GA4 코드·댓글·Like와 과거 데이터 이관을 blog.anyflow.net 운영에 반영했다. 3단계 자동 배포와 anyflow.net 도메인 전환은 보류한다. RSS·sitemap은 추가하지 않는다.

최신 정적 사이트와 댓글 API 이미지는 release-20261014-6dab388이다. 코드 6dab388·콘텐츠 2d06f6c를 사용했다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 코드 저장소는 비공개 git@github.com:anyflow/anyflow-blog.git이다. 댓글 API는 배포했으나 GitHub SSH 초기 연결 종료로 댓글·Like 저장 확인은 미완료다. 실제 확인 범위는 문서 마지막 기록을 따른다.

## 미리보기

```sh
make sync
BLOG_OUTPUT_DIR=_preview npm run build
```

콘텐츠를 변경한 경우에만 `make sync`를 수행한다. 관련 테스트와 대표 동작 확인은 아래 검증 기준을 따른다.

새 콘텐츠 원본은 비공개 `anyflow/blog` 저장소 루트다. 현재 Mac의 SSH 터널 미리보기는 `http://127.0.0.1:8765/`이며 OpenRC의 Node 서버가 정적 파일·댓글 API를 함께 제공한다. 댓글은 운영 저장소에서 분리한 preview Git을 사용하며 운영 `blog.anyflow.net`과 분리한다. 빌드는 성공한 결과만 전환하고 이전 생성 결과 한 개를 `.cache/previous-build`에 보관한다.

## 빌드/배포

### 원샷 설치
    make anyflow-blog-c

수행 순서: cert-manager 확인 -> Gateway 적용 -> 인증서 발급 대기 -> docker build -> kind load -> deployment/service/httproute apply -> rollout wait

### 원샷 제거
    make anyflow-blog-d

### 기존 배포 갱신
    cd apps/anyflow-blog
    make load deploy

Makefile은 사이트·댓글 API 이미지를 함께 빌드·kind 적재하고 API를 먼저 rollout한다. service/anyflow-blog-comments Secret의 config.json·github-comment-deploy·known_hosts가 먼저 필요하다. 운영 설정·전용 SSH 키는 비추적 .cache/comments-runtime/에 별도로 보관하며 값을 출력하거나 Git에 넣지 않는다. manifest의 고유 이미지 태그로 삭제 없이 rollout한다. root anyflow-blog-r은 삭제를 포함하므로 일반 배포에는 사용하지 않는다.

### 수동 빌드/배포 (개발 중)
    cd apps/anyflow-blog
    make load deploy

## 접근

- HTTPS: https://blog.anyflow.net/
- DNS: blog.anyflow.net -> anyflow.iptime.org -> 222.108.188.34
- TLS: Let Encrypt, cert-manager HTTP-01 challenge
- Gateway: public-gateway (cluster namespace), blog.anyflow.net listener
- HTTPRoute: anyflow-blog (service namespace)

## 검증 기준

전수 검증은 개인 vault의 `NOW/NEW BLOG/blog 이전 TODO.md`와 관련 spec의 구현 TODO를 모두 완료한 뒤 최종 단계에서 한 번만 수행한다. 보류 중인 GitHub Actions·Argo CD 자동 게시도 완료 조건에 포함한다. 공통 변환기 변경과 중간 배포에도 같은 기준을 적용한다.

- 기능별로 변경한 로직의 관련 테스트와 대표 사례만 확인한다. 새 복잡한 로직의 작은 테스트와 글 저장 시 데이터 손상 방지 확인을 유지한다.
- PC·모바일·라이트·다크는 해당 변경에 직접 영향을 받는 화면만 확인한다. 수정하지 않은 기능과 이미 통과한 화면을 반복 검사하지 않는다.
- 전체 글·원본 블록·본문 보존 대조, 전체 이미지 디코딩·자산 해시, 전체 공개 URL, 모든 화면 조합 검사는 최종 전수 검증으로 모은다.
- 미리보기 갱신에 필요한 빌드와 생성기의 기본 입력 검증은 유지한다. 매 기능마다 전체 회귀 테스트나 별도 콘텐츠 전수 검사를 실행하지 않는다.
- 미배포 작업에서는 운영 상태를 재확인하지 않는다. 실제 배포 시 상태·변경 파일·대표 동작만 확인한다.
- UI 자동화 도구 복구에 오래 매달리지 않는다. 실패하면 간단한 대체 확인 방법으로 전환한다. 별도 검수 보고서·JSON·스크린샷은 필요할 때만 남기고 기본 결과는 TODO에 기록한다.
- 최종 전수 검증에서 발견한 문제는 수정한 부분만 다시 확인한다. 전체 검증을 반복하지 않는다. anyflow.net 전환은 별도 승인을 받는다.

## 후속 단계

후속 작업:
- 3단계 GitHub runner·GHCR·배포 선언·Argo CD 자동 Sync 구성. 별도 Argo CD 설치 후 재개
- 실제 새 댓글 PR·승인 OFF/ON·메일 수신과 GitHub SSH 연결 안정성 확인
- GA4 실제 수신, UA 통계 export 백업 유무, Cassandra 백업의 잘린 날짜 확인
- 모든 구현 TODO 완료 후 UUID 주소 일괄 정리·최종 전수 검증 1회·별도 승인에 따른 anyflow.net 전환

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

현재 사이트·댓글 API 태그는 release-20261014-6dab388이다. manifest의 태그를 Makefile에서 읽으며 이미지 label에 코드·콘텐츠 commit을 기록한다. GHCR 업로드 없이 kind 두 노드에 적재한 이미지를 사용한다. 다음 릴리스에는 새 태그를 사용한다.

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

## 2026-10-13 본문 정상화 배포

현재 공개 결과는 콘텐츠 main 30fe184와 코드 master 5a0f53b로 생성했다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다.

| 항목 | 확인 |
| --- | --- |
| 콘텐츠 commit | 30fe184a7e4172cea169e5eb617faf2e6c21aa53 |
| 이미지 코드 commit | 5a0f53b2f3f5386e36fd1171250dbcb53b925034 |
| 이미지 | ghcr.io/anyflow/anyflow-blog:normalize-20261013-30fe184 |
| 이미지 ID | sha256:7cf494925380826bf747d98d9cbfb12f65f7bfc1d5c0f192df52003f55434316 |
| 런타임 | anyflow-blog-8696ddf644-r6mjx, Ready 1/1, 재시작 0, 이미지 ID와 label 일치 |
| 회귀 검사 | 13/13, 누락 첨부·빈 입력 실패 시 이전 결과 유지 |
| 원본 대조 | 공개 글 394개, 이미지 639개, 캡션 223개, 알림 상자 102개, 접기 74개, 인용문 112개, 표 29개·243행, 제목 1,207개, 코드 260개, 블록 수식 2개 일치 |
| 이미지 검사 | 공개 참조 이미지 1,123개 실제 디코딩·SVG 파싱 성공, Notion 블록 ID와 이미지 해시 대조 |
| Obsidian | 공개 글 394개, 이미지·오디오 임베드 640개와 블록 링크 90개에서 누락 대상 0 |
| 공개 URL | 글 394개·첨부 1,133개 총 1,527개 HEAD 200, 비공개 정상화 manifest 404 |
| 첨부 | HTML 파일은 application/octet-stream·attachment·nosniff 응답 |
| 브라우저 | 라이프치히 이미지·여러 문단 캡션·알림 상자와 중첩 인용문·다음 글, 본문 블록 이동, 수식, 모바일 가로 넘침 0 확인 |

서버의 npm registry DNS 조회가 실패하고 대용량 GitHub fetch가 지연되어, GitHub에 push한 콘텐츠를 Git bundle로 전달하고 commit ID를 대조했다. npm ci --offline과 실제 Git 콘텐츠의 Eleventy 빌드를 통과했다. 검증한 정적 출력만 기존 r2 nginx 런타임에 새로 복사하고 nginx -t를 통과한 고유 이미지를 kind에 적재했다. 표준 Dockerfile 전체 재빌드와 GHCR 업로드를 수행한 것으로 간주하지 않는다. 서버의 DNS·기본 라우트는 변경하지 않았다.

원본 스냅샷에서 목적 블록이 없는 링크 8종은 해당 글 처음으로, 대상 정보가 없는 인라인 참조 2개는 원문 주소로 연결한다. 컬럼은 Obsidian의 읽기 순서로 이어진다. 이 범위와 출처는 CONTENT_CONTRACT.md 및 콘텐츠의 _assets/notion-import.json에 기록한다. 전체 글의 픽셀 동일성·사용자 UI 승인, 최신 글 3개 보완과 GitHub Actions 자동 게시 등 남은 단계는 PLAN.md를 따른다.

상시 미리보기 http://127.0.0.1:8765/도 같은 콘텐츠로 갱신했다. 상세 증거는 Mac의 /Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 전체 정상화/에 보관한다.

## 2026-10-13 파비콘과 다열 배치 교정

콘텐츠 c3cd15e70a74609e0285eb6ad6ebfde202347dca와 코드 79790f85a476b4da42097a92e5b5db7d188435d9를 commit·push하고 blog.anyflow.net에 배포했다.

- 이미지: ghcr.io/anyflow/anyflow-blog:columns-20261013-c3cd15e
- 이미지 ID: sha256:ba5e0af45d4e6729291ee0580090bda3e6d902560f9e05d0699a90478f3b7507
- Pod anyflow-blog-5c7db6b855-hbh5g: Ready 1/1, 재시작 0, 실제 imageID와 두 revision label 일치
- 원본 꽃 파비콘을 _assets/visuals/site-icon.png에 보관하고 홈의 favicon 속성으로 연결했다. 공개 PNG의 SHA-256 832c60831d6c4adcce0262a586a4315e7c2f4efb19aad4da9ca422df4f6bf333이 원본과 일치한다.
- 원본 다열 묶음 62개·열 145개를 순서·비율대로 복원했다. 원본 대조와 회귀 검사 15/15를 통과했다. 이미지 639개·캡션 223개 등 다른 표현의 원본 대조도 유지한다.
- 빈 글의 묘비 사진은 PC에서 154·154·308px, 높이 205.328·205.328·231px로 같은 행에 표시된다. 행 높이 294.59375px와 46px 간격이 원본과 일치한다.
- 모바일 390×844에서는 원본처럼 세로로 전환하고 문서 가로 넘침이 없다. 이미지 너비 192·192·342px와 각 열 높이를 대조했다.
- Obsidian의 읽기 화면에서도 세 사진 152·152·304px과 1:1:2 비율을 확인했다. 다열 묶음은 하나의 인용 블록이므로 내부 참조를 행으로 연결한다. 임베드 640개·블록 링크 90개의 대상 누락은 0이다.

상시 미리보기도 갱신했다. 검증된 정적 출력을 캐시 nginx 런타임에 패키징하는 방식과 DNS·라우팅 유지 조건은 앞선 배포 기록을 따른다. 기존 anyflow.net은 변경하지 않았다. 증거는 /Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 아이콘과 다열 배치/에 보관한다.

## 2026-10-13 본문 폰트 가장자리 처리 교정

공통 body의 -webkit-font-smoothing: antialiased 강제를 제거해 브라우저 기본값 auto를 사용한다. 본문 크기 16px·굵기 400·줄 높이 24px을 유지한다. 검색 기능은 구현하지 않았다.

- 코드 commit: 54b1f187f8694c987cc59c7b1e5bf610e85e3c69, 콘텐츠: c3cd15e70a74609e0285eb6ad6ebfde202347dca
- 이미지: ghcr.io/anyflow/anyflow-blog:font-20261013-c3cd15e
- 이미지 ID: sha256:98b277e01ed8fec796aeafc6ed9cda34b4771bc276936261c48ead611bd248cc
- Pod anyflow-blog-697cd5b467-fjdgc: Ready 1/1, 재시작 0, imageID와 코드·콘텐츠 label 일치
- 회귀 검사 15/15와 전체 글 394개·첨부 1,134개의 정적 빌드를 통과했다. 상시 미리보기도 갱신했다.
- 공개 CSS 해시는 8c71e829b581이며 실행 Pod의 CSS SHA-256이 생성 결과와 일치한다.
- 원본과 공개 어쨌건간에 글을 Mac 브라우저 1280×720에서 대조했다. 본문의 font-family·크기·굵기·색상·줄 높이·가장자리 처리 auto가 일치한다. 다른 OS와 전체 글의 픽셀 동일성은 검증하지 않았다.

검증된 정적 출력을 캐시 nginx 런타임에 패키징해 kind에 적재했다. 표준 Dockerfile 전체 재빌드와 GHCR 업로드는 수행하지 않았다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지했다. 화면과 설정 비교 자료는 /Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 본문 폰트/에 보관한다.


## 2026-10-13 문단 복원 — 로컬 완료, 운영 배포 대기

사용자 요청으로 Mac의 `/Users/anyflow/workspace/anyflow-blog`에서 GitHub 소스 `6f81582`를 받아 수정·검증한다. 원본 스냅샷과 이미지 대응 자료는 `.cache/notion-reference.json`, `.cache/notion-aliases.json`, `.cache/image mapping.json`에 보관한다. 전체 394개 글을 재변환하고 iCloud 작성 vault의 305개 글과 비공개 검증 manifest에 반영했다. 게시 속성·커버·아이콘과 공백 외 본문은 보존한다.

빈 문단 1,048개의 ID·순서, 앞뒤·연속 줄바꿈이 있는 68개 블록 및 이미지·캡션·표·다열 등 전체 구조를 대조했다. 테스트 16/16과 394개 글·참조 첨부 1,134개의 빌드를 통과했다. 대표 글의 PC 1280×720·모바일 390×844·라이트·다크에서 빈 문단 높이 30px, 첫 두 문단 사이 34px과 각 문단 높이를 확인했다. Obsidian 읽기 보기에서도 빈 문단 6개와 문단 앞 줄바꿈을 확인했다. 전체 글의 픽셀 일치를 뜻하지 않는다.

Mac의 `net.anyflow.blog-local-preview` LaunchAgent가 `127.0.0.1:8766`에서 `_preview`를 제공한다. 설정 파일은 `~/Library/LaunchAgents/net.anyflow.blog-local-preview.plist`다. SSH 터널의 8765 포트와 별도로 동작하며 Mac 로그인 시 시작하고 프로세스 종료 후 재시작한다. 실행 프로세스 종료 후 새 PID로 0.49초 만에 복구하고 HTTP 200이 되는 것을 검증했다. 작성 vault의 미공개 변경을 검토할 때는 아래 명령을 사용한다.

```sh
rsync -a --exclude=.git --exclude=.obsidian "$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/blog/" .cache/blog/
BLOG_OUTPUT_DIR=_preview npm run build
```

검수 자료와 작성본 백업은 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 문단 간격/` 및 `work/blog paragraph spacing/before-local-20261013/`에 보관한다. 문단 복원은 코드 `c792373`·콘텐츠 `7fc3314`를 GitHub에 게시했다. 사용자 커버 편집과 Obsidian 화면 설정은 게시 범위에서 제외한다. 운영 배포는 수행하지 않으며 서버 접속 복구 후 원격 작업트리의 변경과 대조해 반영한다.


## 검색 — 구현·검증 완료, 운영 배포 대기

Recent·By Category 검색 버튼을 제거하고 상단 Search·태그 버튼에 Pagefind 1.5.2 공통 팝업을 연결했다. 공개 글 394개만 색인하고 전체 테스트 18/18을 통과했다. PC 1280×720·모바일 390×844·라이트·다크, 본문·제목·태그 검색, 태그 해제, 결과 추가·이동과 Esc·Tab·포커스 복원을 검증했다. 새 검색 색인도 기존 빌드의 성공 시 전환 절차에 포함한다.

로컬 확인 URL은 `http://127.0.0.1:8766/`이며 파일 제공 LaunchAgent를 그대로 사용한다. 검수 자료는 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 검색/`에 보관한다. 검색 코드·문서는 GitHub에서 관리하며 운영 배포는 수행하지 않았다. 홈 서버의 배포 이미지 검증은 접속 복구 후 진행한다.

## 작성 템플릿·누락 글 — Git 게시, 운영 배포 대기

Obsidian 기본 Templates의 폴더를 blog vault `_templates`로 지정했다. 원본 날짜·분류·주소를 확인해 Agent 운영 아키텍처·Prompt/Context/Harness·국토 종주 3편을 연결했다. Prompt 글은 기존 Markdown 본문을 보존하고 국토 종주의 noindex 설정을 유지한다. 따옴표 cleanUrl 설정이 노출되던 기존 1편도 원본에 맞춰 설정 코드만 정리했다.

공개 397개 글·참조 첨부 1,144개를 같은 로컬 미리보기로 빌드했고 테스트 21/21을 통과했다. 396개 변환 글을 원본 블록과 대조하고 Prompt 원문 보존을 별도 확인했다. 사용자 요청으로 콘텐츠 `5371f9a`와 본 소스 변경을 commit·push한다. 기존 사용자 테마·Istio 커버 편집은 제외하고 게시할 글 397편의 manifest 해시를 대조했다. 검수 자료와 백업은 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 작성 템플릿/` 및 `work/blog 작성 템플릿/before/`에 보관한다. 운영 배포는 수행하지 않았다.

## 2026-10-13 문단·검색·누락 글 운영 배포

LAN 192.168.0.4:22 접속을 확인하고 깨끗한 서버 작업트리를 GitHub에 게시한 코드·콘텐츠로 fast-forward했다. 서버의 GitHub fetch와 npm DNS 조회가 실패해 Git bundle과 잠금 파일의 npm 캐시를 전달했다. DNS·기본 라우트는 변경하지 않았다.

| 확인 | 결과 |
| --- | --- |
| 정적 코드·콘텐츠 | `58dbc1f74ab63061b24a91cbfcff02ecbf07a0d6` · `5371f9acf943d2fd986a528c8b3ac3530f297aa4` |
| 이미지 | `ghcr.io/anyflow/anyflow-blog:publish-20261013-5371f9a` |
| 이미지 ID | `sha256:35cab6ccbee437c6bf3ae9c7d1cfb38f8b2f583a5971ae1d095840cf15e29ef4` |
| 실행 Pod | `anyflow-blog-6966ddf6c7-vqznv`, Ready 1/1·재시작 0·imageID 일치 |
| 검증·빌드 | 서버 테스트 21/21, 공개 글 397개·참조 첨부 1,144개·미해결 참조 0 |
| 정적 파일·색인 | 이미지·실행 Pod 파일 2,038개 SHA-256 일치, Pagefind 397편 |
| 공개 HTTPS | 홈·글 398개·첨부 1,144개·검색 파일 421개, 총 1,963개 최종 200. 초기 연결 시간 초과 8건은 대상 재시도 후 200 |
| 공개 경계 | Git·Obsidian 설정·Markdown·비공개 manifest 등 6개 경로 404 |
| 브라우저 | 복원 글·표·커버·아이콘, Harness 본문 검색·kagent 정확한 태그 필터 확인. 모바일 390×844 라이트·다크 가로 넘침 0, 대표 빈 문단 6개 높이 30px |
| 경로 유지 | Gateway·HTTPRoute·Service spec 배포 전후 일치, 기존 www.anyflow.net DNS 동일 |

검증한 서버 정적 출력을 캐시 nginx 런타임에 패키징해 kind 두 노드에 적재하고 기존 Deployment를 삭제 없이 rollout했다. 표준 다단계 Dockerfile 전체 재빌드와 GHCR 업로드는 수행하지 않았다. 이전 font 이미지와 Deployment 이력을 유지한다. 상시 미리보기도 397편으로 갱신했다. 증거는 Mac의 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 운영 배포/` 및 서버 `.cache/release-20261013-5371f9a/`에 보관한다. 자동 게시·글별 OG 메타데이터 보완은 후속 작업이다.

## 2026-10-13 Share 동작 보정

원본의 공개 공유 코드를 확인해 Web Share 지원 시 OS 공유창을 사용하고, 미지원·권한 오류 시 링크 복사·Facebook·X·LinkedIn·Pinterest 메뉴를 표시한다. 취소는 추가 동작 없이 끝낸다. 공유 아이콘은 로컬 자산이며 URL을 매개변수로 인코딩하고 메뉴는 Esc·바깥 클릭으로 닫힌다. 테스트 24/24와 전체 397편 미리보기 빌드, Web Share 미지원 상태를 재현한 격리 브라우저의 PC·모바일·다크·키보드 조작을 검증했다. SNS 실제 게시·전송은 수행하지 않았다.

배포 태그는 `share-20261013-5371f9a`이며 콘텐츠 `5371f9a`를 유지한다. 이전 publish 런타임에 검증한 정적 결과를 패키징하는 방식을 사용한다. 검수와 배포 증거는 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog Share/` 및 서버 `.cache/share-review/`에 보관한다.

운영 검증: 코드 `c3517f63051c5aa5b70be353c9e5e47ebc2f7b71`, 이미지 ID `sha256:df6df31a4c48bd0904c3c2a111ecca1341c280e3fe19a883f04483bf0297a2ae`, Pod `anyflow-blog-cc6c6757c-98fsp` Ready 1/1·재시작 0이다. 이미지·실행 Pod의 정적 파일 2,043개 해시가 일치하고 공개 홈·대표 글·CSS·공유 JS·메인 JS·아이콘 4개의 실제 응답 9개가 200이며 바이트 해시도 일치한다. 공개 HTML에 격리 검수용 API override는 없다. Gateway·HTTPRoute spec과 기존 anyflow.net은 유지한다.

## 2026-10-13 홈 소개 링크 높이

코드 `66990592fcadf0477dcef8d13f69695591a4e831`에서 bookmark의 `height:74px`·`align-self:flex-start`를 `height:auto`·`align-self:stretch`로 바꿨다. 운영 PC와 미리보기 PC·태블릿의 목록·카드가 모두 97px이며 모바일 390px의 세로 카드 228px·이미지 154px과 라이트·다크를 유지한다. 서버 테스트 24/24와 397편 빌드를 통과했다.

이미지는 `ghcr.io/anyflow/anyflow-blog:profile-20261013-5371f9a`, ID는 `sha256:d3b41be0c7fc77713e957de8785f2f2e083e8c0e60770e57d1a35f37c6b2713b`다. Pod `anyflow-blog-54686f7cb7-svst5` Ready 1/1·재시작 0, 정적 파일 2,043개 일치와 Gateway·HTTPRoute spec 유지를 확인했다. 기존 캐시 nginx 패키징·kind 적재 방식과 콘텐츠 `5371f9a`를 유지한다. 검수 자료는 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 소개 높이/`에 보관한다.

## 2026-10-13 Notion 다크 팔레트 — Git 게시, 운영 배포 대기

사용자가 지정한 app.notion.com 링크가 연결되는 `anyflower.notion.site`의 실제 CSS `77281-c4b3c46f690b55b2.css`에서 `.notion-dark-theme` 팔레트를 추출했다. 배경 `#191919`, 본문 `#f0efed`, 보조 글자 `#ada9a3`, 구분선 `#383836`, 보조면 `#202020`, 팝업 `#252525`와 카드·코드·알림 상자의 색상을 맞췄다. 다크 선택자만 수정했고 라이트·폰트·레이아웃·태그 이름별 색상 계산은 유지한다.

서버 테스트 24/24·397편 미리보기 빌드와 PC·모바일의 홈·검색·기술 글·알림 상자·라이트 전환을 확인했다. Mac 검토 주소는 `http://127.0.0.1:8765/`다. 사용자 요청으로 commit·push까지만 수행하고 Deployment 이미지·generation과 배포 manifest를 유지한다. 운영 색상은 아직 기존 profile 버전이다. 근거와 화면은 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 다크 테마/`에 보관한다.


## 2026-10-13 4단계 미리보기 검증 — 운영 배포 대기

Mermaid의 전역 SVG 16px 축소를 아이콘 범위 제한으로 수정하고, 커버 좌표를 선택 속성으로 처리하며 본문 사진 확대 팝업을 추가했다. 소스 수정·테스트·빌드는 alpine에서 수행했다.

- 테스트 29/29, 공개 글 397개·참조 첨부 1,144개·미해결 참조 0으로 `_preview` 빌드를 완료했다.
- Mermaid 글 9개·다이어그램 13개의 PC 1280×720·모바일 390×844·라이트·다크 36개 화면 조합에서 SVG 52개와 테마 전환을 확인했다. 대표 SVG 폭은 16px에서 676px로 복원되며 UI 아이콘은 16px를 유지한다.
- 새 커버의 미입력·빈 좌표는 중앙이며 기존 숫자·이전 CSS 좌표를 보존한다. 현재 공개 글·홈의 생성 데이터를 수정 전 HEAD와 대조해 동일함을 확인했다. Obsidian에서 좌표 없는 검증 노트의 배경 위치 50% 50%·커버 높이 240px을 확인하고 검증 노트는 OS 휴지통으로 이동했다.
- 사진 확대는 원본 자산을 사용한다. PC·모바일·라이트·다크에서 화면 안에 표시되며 사진·배경·닫기 버튼 클릭과 Esc로 닫힌다. Enter·Space 열기와 닫은 뒤 포커스·스크롤 복원을 확인했다. 닫기 버튼은 최소 44px이다.
- 현재 Deployment는 generation 55, `ghcr.io/anyflow/anyflow-blog:profile-20261013-5371f9a`, Available 1이다. commit·push·배포와 배포 환경 변경은 수행하지 않았다.
- 검수 자료는 Mac의 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 4단계/`에 보관한다. 운영 검증은 배포 후 별도로 수행한다.

Mermaid 확대도 일반 사진과 같은 팝업으로 연결했다. 9개 글·13개 다이어그램의 PC·모바일·라이트·다크 총 52개 열기·닫기 조합에서 SVG ID 중복 없음, 본문 SVG·높이·포커스 복원과 테마 전환을 확인했다. 접힌 블록은 펼친 뒤 검증했다. Enter·Space·Esc·배경 클릭과 Mermaid 이후 일반 사진 열기도 확인했다. native dialog의 close 이벤트 완료 후 본문 복원을 확인하며 commit·push·운영 배포는 수행하지 않았다.


## 2026-10-13 카드 이미지 갤러리 — 운영 배포 대기

카드는 `thumbnail` 선택값 → 본문 순서상 첫 사진·Mermaid → 텍스트 순서로 표시한다. 커버와 독립적이며 이전 export의 hero_image는 자동 선택에서 제외한다. 사진은 채워서 자르고 Mermaid는 전체 도형을 맞춰 표시한다.

- 테스트 35/35, 공개 글 397개·참조 첨부 926개·미해결 참조 0으로 미리보기 빌드를 완료했다. 기존 397개 글의 본문 HTML·제목·태그·주소·커버·위치는 수정 전과 동일하다.
- 현재 카드: 사진 237개·Mermaid 3개·텍스트 157개. 기존 참고값 제외와 첫 그림 기준으로 카드 221개가 재산정되었다. 원본 자산은 삭제하지 않았으며 공개 산출물에서 불필요한 이전 힌트 자산을 제외한다.
- 홈의 처음 10개 카드에는 Mermaid 1개를 렌더링하고 숨긴 카드 2개는 렌더링하지 않는다. Recent의 Load more로 70개를 표시한 뒤 Mermaid 3개를 확인했다. PC·모바일·라이트·다크, 그림 영역 클릭의 글 이동과 상세 Mermaid 확대를 확인했다.
- blog vault에 Blog 카드 이미지 플러그인을 설치·활성화했다. 현재 글의 사진·Mermaid 및 vault의 다른 이미지 선택, 검색과 자동 선택 복원을 확인했다. 실제 Obsidian에서 저장한 중첩 Mermaid의 표준 블록 참조를 웹 loadContent로 읽어 같은 도형을 선택하는지 확인했다. 선택 중 글 변경·닫히지 않은 코드 블록은 저장을 거부한다.
- 패키징은 기존 Markdown-it 14.1.1 배포 번들을 재사용한다. 추가 npm 의존성은 없고 Obsidian용 단일 main.js를 생성한다. 원본은 integrations/obsidian-card-image/picker.js·diagrams.js다. npm test의 pretest가 패키징과 라이브러리 바이트 보존 검사를 실행한다.
- 검수 자료는 Mac `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 카드 이미지/`에 보관한다. commit·push·운영 배포와 배포 환경 변경은 수행하지 않았다. Obsidian 모바일 실기기는 미검증이다.

## 2026-10-13 OG·YouTube 카드 개선 — 운영 배포 보류

OG에 글별 절대 URL과 대표 이미지를 추가했다. 이미지 우선순위는 카드 사진·YouTube 썸네일 → 글 커버 → 홈 커버다. 현재 공유 URL은 blog.anyflow.net이며 기존 anyflow.net은 유지한다.

YouTube iframe도 사진·Mermaid와 같은 본문 순서에서 카드 이미지로 취급하며 Obsidian 갤러리에서 선택할 수 있다. 폴스타4는 첫 영상 yonRGtMDDH8의 썸네일을 자동 사용한다. 선택기 0.2.0을 작성 vault에 설치·재로드했다.

관련 테스트 4개만 실행해 통과했고 폴스타4의 미리보기 카드·OG·YouTube 이미지 HTTP 200과 Obsidian 갤러리 표시를 확인했다. 미리보기 갱신 빌드 외 전수 검사·전체 회귀 테스트는 실행하지 않았다. 사용자 요청 범위는 Git 게시까지이며 이미지 생성·운영 배포는 수행하지 않는다.

## 2026-10-13 X 카드 이미지 — 운영 배포 보류

X 게시물의 첨부 사진·동영상 포스터를 카드 자동 선택·Obsidian 갤러리·OG에 연결한다. 직접 X/Twitter iframe과 Notion iframe으로 감싼 주소를 지원한다. 빌드 캐시 `.cache/x-thumbnails.json`을 재사용하고 새 게시물만 조회한다. X 공개 임베드 응답에 의존하며 조회 실패 시 다음 그림을 사용한다. 텍스트 게시물의 별도 이미지 생성은 하지 않는다.

관련 테스트 5개와 Mike Portnoy is Back 글의 카드·OG·이미지 응답·Obsidian 갤러리만 확인했다. 선택기 0.3.0을 설치·재로드하고 미리보기를 갱신한다. 전수 검사·전체 회귀 테스트·운영 배포는 수행하지 않는다.

## 2026-10-14 GA4·댓글·Like — 구현·미리보기 완료, 운영 연결 보류

기존 GA4·댓글 전용 Git 저장·과거 데이터 이관을 구성했다. 이번 작업은 운영 Deployment·DNS·라우팅을 변경하지 않는다.

| 대상 | 완료 범위 | 남은 확인 |
| --- | --- | --- |
| GA4 | 계정 100207646·속성 333773406·스트림 4090770035·ID G-YWPHXJFYET 확인, 운영 두 hostname만 측정, 중복 태그 방지, 관련 테스트 4/4 | 새 코드의 실제 page_view 수신, UA 시절 export 백업 유무 |
| 댓글 API·UI | 고정 글 ID·공개 카탈로그·쿠키 권한·관리자 인증·답글·Like·승인 기본 OFF·공개 비밀값 제외·충돌 재시도·PID 잠금 복구 | 운영 Service·Secret 연결·이미지 생성·배포 후 실요청 |
| 댓글 저장·게시 | 비공개 anyflow/blog-comments, incoming PR·승인 OFF 자동 merge/ON 대기·public JSON 생성 | 실제 신규 댓글 PR·관리자 승인·GitHub 알림함·메일 수신 |
| 데이터 | 댓글 198(Disqus 79·이미지 119, 공개 196·삭제 2, 답글 102), 62개 글과 홈, Like 95개 대상(댓글 77대상 합24·글과 홈 18대상 합27, 0명시62) | Cassandra 1백업 블록의 잘린 날짜 |
| 원본 보존 | XML·OCR·텍스트·이미지 46개를 비공개 저장소에 보관, 대조 완료한 본문 백업 44블록 제거, vault 원본 자산 유지 | 미확인 Cassandra 백업은 본문 유지 |

데이터 revision은 `73c64351c9fe479ff05f2fd2c0fe061b566a91e6`이며 [댓글 공개 Actions](https://github.com/anyflow/blog-comments/actions/runs/38418854320)가 성공했다. Like·공개 댓글의 직접 수정·삭제는 main에 기록하고 신규 댓글·답글만 PR을 만든다. 댓글 전용 Actions는 3단계 블로그 전체 자동 배포와 구분한다. 운영 저장소의 SSH 쓰기 키는 비추적 `.cache/comments-runtime/`에서 0600으로 관리하며 관리자 설정은 비공개 JSON에 보관한다. 키·토큰 값은 문서·이미지·Git에 넣지 않는다.

미리보기 Node 서버에는 운영 Git과 분리한 preview Git으로 과거 댓글·Like를 넣었다. xDS 글에서 댓글 13개·글 Like 2와 로컬 검증 댓글의 등록·답글·Like 추가를 확인했다. 검증 댓글 2개는 preview Git에만 보관한다. 방문자 쿠키는 1년, 관리자 쿠키는 7일이다. `_preview/comments/catalog.json`에 공개 글·홈의 고정 ID를 넣고 운영 API는 `COMMENTS_CATALOG_URL=http://anyflow-blog/comments/catalog.json`을 5초 캐시로 갱신한다. 이미지에 포함한 카탈로그를 초기값으로 사용한다.

`Dockerfile`의 comments-api target과 `deployment/comments-api.yaml`은 작성했으며 API 이미지는 미빌드·태그 pending이다. 데이터 작업 사본은 emptyDir에 복제하고 SSH 키·config JSON·known_hosts는 Secret에서 읽는다. Secret root 소유·0440·fsGroup 1000 조합을 사용한다. nginx는 공식 entrypoint가 `/etc/resolv.conf`의 DNS를 템플릿에 넣고 API hostname을 요청 시 해석한다. API Service 없이도 nginx가 시작되도록 `nginx -t` 1회 통과했다. 운영 apply·rollout·GHCR 등록·도메인 전환은 수행하지 않았다.

관련 테스트와 대표 사례만 확인했다. 전체 콘텐츠·URL·이미지·화면 조합 검사와 최종 UUID 주소 정리는 수행하지 않았다. 전수 검증은 3단계를 포함한 전체 구현 TODO 완료 후 최종에서 한 번만 수행한다.

댓글 저장소 Watch는 Custom → Pull requests만 선택해 저장했다. 실제 신규 PR·메일 수신 시험은 운영 연결 후 수행한다. 관리자 미리보기 로그인 값은 Mac의 `~/Library/Application Support/anyflow-blog/comments-preview-admin.txt`에 0600으로 보관한다. 운영 Secret은 별도로 연결하며 값은 Git에 넣지 않는다. 홈 서버의 GitHub SSH가 간헐적으로 시간 초과되어 이번 Git 게시에는 임시 역터널을 사용했다. 운영 배포 전 서버의 GitHub 접근 경로를 확인한다.

## 2026-10-14 표시 개선·댓글 API 운영 배포

사용자 요청으로 blog.anyflow.net 정적 사이트를 갱신하고 댓글 API를 신규 배포했다. 기존 anyflow.net·DNS·Gateway·HTTPRoute·기존 정적 Service·호스트 DNS·기본 라우트는 변경하지 않았다. 3단계 자동 배포와 도메인 전환은 진행하지 않았다.

| 항목 | 결과 |
| --- | --- |
| 코드·콘텐츠 | anyflow-blog 6dab3882dbd19201773d82315d6ce12872a9b33d / blog 2d06f6cdf68bb9d84798eac961bc8ff072a819d3 |
| 사이트 이미지 | ghcr.io/anyflow/anyflow-blog:release-20261014-6dab388 |
| 사이트 imageID | sha256:0a1b96f6339f8ee47427dc3a6c77532899d7396551d4a766d00f60ab82cd59fd |
| API 이미지 | ghcr.io/anyflow/anyflow-blog-comments:release-20261014-6dab388 |
| API imageID | sha256:da4d5cd63a819b2ac5ef35ef439740f671d7bfd31dd81e65eddd00823e66918b |
| 런타임 | service namespace의 사이트·API Deployment rollout 성공, 각 새 Pod Ready 1/1·재시작 0 |
| 운영 자격증명 | 별도 config.json·댓글 저장소 전용 쓰기 키·공식 known_hosts를 Secret에 연결. preview 토큰·테스트 댓글은 사용하지 않음 |
| 대표 화면 | 홈·YouTube·X 대표 글 HTTP 200, AI Agent Platform Mermaid 3개 정상 크기와 확대·닫기·본문 복원, 다크 배경 rgb(25,25,25), OG 커버 URL 확인 |
| 통계 | blog.anyflow.net에서 gtag 미로드 확인. anyflow.net 전환 전까지 실제 GA 수신 검증은 대기 |
| 댓글 조회 | 대표 xDS 글의 운영 데이터 13개·글 Like 2, preview false·moderation false 확인. LAN에서 blog.anyflow.net SNI·인증서 검증을 유지한 HTTPS 200도 확인 |
| 댓글 저장 | Git fetch/clone 중 SSH banner 전 연결 종료로 간헐 503. Like 추가·취소 확인 실패, 댓글 데이터 revision 73c6435 유지, 신규 PR·승인 OFF/ON·메일 수신 미확인 |

정규 다단계 Docker 빌드는 npm ci가 지연되어 중단했다. 사이트는 기존 profile nginx 런타임에 검증한 _preview 정적 결과와 새 resolver 템플릿을 패키징했다. API는 공식 Node 22 런타임·Git·OpenSSH·원격 소스·검증한 카탈로그로 패키징했다. label의 build-method는 verified-preview-artifacts다. 새 nginx 설정 검사와 API 시작 검사를 통과했고 두 이미지를 kind 두 노드에 적재했다. 정규 Dockerfile 전체 빌드나 GHCR 업로드 성공으로 간주하지 않는다. 클러스터를 재생성하면 이미지를 다시 적재해야 한다.

댓글 GitHub SSH 연결은 22·443에서 성공과 약 10초 후 banner 전 reset을 모두 관측했다. 전용 키의 쓰기 권한과 Secret 읽기·작업 사본을 확인했으며 원인은 확정하지 못했다. 같은 이미지의 ambient Pod와 Docker kind 네트워크 비교에서는 모두 정상 읽기가 가능해 Istio 원인으로 단정하지 않았고 opt-out을 적용하지 않았다. 최종 운영은 github.com:22, ConnectTimeout 20, ServerAliveInterval 30·CountMax 3과 host key 검증을 사용한다. 진단용 verbosity·ControlMaster·IPQoS 변경은 최종 설정에 남기지 않았다.

이 배포의 API Ready probe는 TCP 확인이다. Pod Ready가 댓글 등록·Like 저장 성공을 뜻하지 않는다. Git 연결 안정화와 실제 저장·PR·메일 확인은 TODO에 미완료로 남긴다. 전체 회귀·콘텐츠·URL·이미지 전수 검증은 실행하지 않았다. 전체 구현 TODO 완료 후 최종 한 번만 수행한다.

관리자 운영 토큰은 Mac의 ~/Library/Application Support/anyflow-blog/comments-production-admin.txt에 0600으로 보관한다. 미리보기 관리자 토큰과 별개다. 운영 설정·키 원본은 .cache/comments-runtime/에 비추적 보관하며 값은 문서·이미지·Git에 넣지 않는다. 이전 profile 이미지와 Deployment 이력은 보존해 정적 사이트의 rollout undo가 가능하다.

## 2026-10-14 댓글 UI·방명록 복원 운영 반영

- 코드 5738a62·콘텐츠 d5b6645·댓글 데이터 2b205e8을 GitHub에 게시했다. 댓글 게시 [Actions](https://github.com/anyflow/blog-comments/actions/runs/38467601122)가 성공했다.
- 정적 이미지 ghcr.io/anyflow/anyflow-blog:release-20261014-5738a62, imageID sha256:68ca6844b3effafe99135843d14fe283c4a6a5ae52dd8911264a2c84c166c8d9을 kind 두 노드에 적재했다. Deployment 선언을 apply했고 새 Pod anyflow-blog-7d58fb49b8-rcql5는 Ready 1/1·재시작 0, rollout 완료다. 검증한 _preview 산출물로 패키징하고 이전 html을 이미지 안에서 교체했다. 정규 Dockerfile 재빌드·GHCR 업로드는 수행하지 않았다. API 이미지는 release-20261014-6dab388을 유지한다.
- HTTPS 홈·Cassandra 200, 본문 백업 제거, Comments 표제 30px·같은 행 오른쪽 Like/댓글 수 14px, 댓글→이름→선택 링크 입력 순서·placeholder·투명 폼을 운영 브라우저에서 확인했다. 홈 댓글 수의 오른쪽 여백은 0px이며 답글 1개 버튼은 기본 aria-expanded=false다. 이전 댓글 배지를 제거했다.
- 운영 API는 홈 공개 28개·Cassandra 1개·preview=false를 반환하고 pending을 제외한다. 전체 이관 223개 중 잠금 원글·답글 2개는 비공개로 보존한다. Cassandra 작성일은 미상으로 표시한다. UI·이관 관련 테스트 21개를 통과했다.
- 기존 anyflow.net·DNS·Gateway·HTTPRoute는 유지했다. 신규 댓글 PR·승인 OFF/ON·메일 수신, 모바일 화면·전체 콘텐츠 전수 검증은 이번 배포에서 실행하지 않았다. 전수 검증은 전체 TODO 완료 후 최종 1회다.

## 2026-10-14 홈 목록·카드 원본 스타일 반영

코드 21ecc28·콘텐츠 d5b6645를 사용해 정적 이미지 ghcr.io/anyflow/anyflow-blog:release-20261014-21ecc28을 패키징했다. imageID는 sha256:cf8c319fb701f7016ac5302bc1a133a71a8ae3ea8a270d8360b671b376ffbcfa다. kind 두 노드에 적재하고 Deployment 선언을 apply해 rollout을 완료했다. 새 Pod anyflow-blog-69885f48db-9nnpm은 Ready 1/1·재시작 0이다. API 이미지와 기존 anyflow.net·DNS·라우팅은 유지한다.

운영 홈에서 카테고리 제목의 원본 배경색·굵기 400·삼각형 없음, 목록 제목 16px·500, 대표 Recent 카드 346×354.625px, Load more 14px·높이 30px·문구 opacity .4·화살표 .3을 확인했다. 미리보기에서 더보기 클릭 후 카드 10→20개 표시를 확인했다. 기존 카드 선택 이미지·태그 색상 계산은 유지한다. 검증한 정적 결과를 기존 nginx 런타임으로 패키징했으며 정규 Dockerfile 재빌드·GHCR 업로드·모바일 조합·전수 검증은 수행하지 않았다. 전수 검증은 전체 TODO 완료 후 최종 1회다.

## 2026-10-14 글 URL trailing slash 제거 운영 반영

코드 7c87a04·콘텐츠 d5b6645를 사용해 정적 이미지 ghcr.io/anyflow/anyflow-blog:release-20261014-7c87a04를 패키징하고 kind 두 노드에 적재했다. imageID는 sha256:d0f7630690af06c11bc57b8039829b519c5556f0055f392147f4d3df6fcf31e2다. nginx 템플릿과 정적 결과를 함께 반영했고 Deployment rollout을 완료했다. 새 Pod anyflow-blog-865d67d6cb-tftsk는 Ready 1/1·재시작 0이다.

글 주소·내부 링크·검색·canonical·OG·댓글 카탈로그를 슬래시 없는 형식으로 통일했다. 홈 /는 유지하며 /post/는 쿼리 문자열을 보존해 상대 Location /post로 301 이동한다. 실제 운영에서 /는200, /introspective-life/anyway는200, /introspective-life/anyway/?source=test&n=2는301과 정확한 Location을 확인했다. 브라우저 최종 URL과 canonical·OG도 슬래시 없는 주소다. 운영 카탈로그398개를 확인했고397글의 기존 ID·물리 index.html은 유지했다. 관련 테스트5개·미리보기 검색 결과·격리 nginx의 루트/글/자산200 및 잘못된주소404를 확인했다.

API 이미지는 유지하고 변경된 카탈로그만 기존5초 갱신 경로로 읽는다. 기존 anyflow.net·DNS·Gateway·HTTPRoute는 변경하지 않았다. 검증한 정적 결과를 패키징했으며 GHCR 업로드·전체 전수 재검증·앞선 감사에서 발견한 다른 결함 수정은 수행하지 않았다.

## 2026-10-14 전수 점검 후 결함 수정 — 운영 반영 대기

현재운영은 release-20261014-7c87a04다. 아래 변경은 remote작업트리·iCloud작성vault·비공개댓글작업사본·미리보기에만 반영했으며 commit·push·운영API재시작·배포는 수행하지 않았다.

- GitStore rawstate5초캐시·single-flight·호출별복사, 쓰기fresh fetch와성공/실패캐시무효화, Git maintenance/gc autoDetach=false를 적용했다. 관련10개테스트를 통과했다. Node PID1에분리유지보수프로세스가남는경로를 Gittrace로재현했으나 기존84좀비개별원인은확정하지않았고정리하지않았다. API교체후해소를확인한다.
- Blade Runner원본이미지4댓글·2답글관계를복원하고private작업사본227개·preview230개로반영했다. sourceID재실행중복방지와기존223개·Like·설정보존을확인했다. 일반본문을오인하지않는HTML제목정규화2개테스트를통과했다. 원본MD·이미지·검토자료는private originals/import-20261014-blade-runner/에보관한다.
- 표코드8개셀의원본개행을공통변환기에서보존하고C++/CLI대상글만재변환했다. bare .md파일명의fuzzy자동링크를막고명시적링크·URL은유지한다. 관련6개테스트통과, 실제preview표에서 multilinecode8·literal BR0, AI글가짜파일명링크0을확인했다. 원본감사의7개수치는다른코드블록의일치로1셀을놓쳐8개로정정했다.
- 렌더fixture3곳absoluteUrl필터와spacingfixture의유효post_id를보완했다. 중복URLfixture는앞선URL수정에서고쳤다. 실패했던대상test를개별재확인했으며전체test/전수검사를반복하지않았다.
- 통합preview397글·879자산·미해결0으로빌드하고OpenRC preview만재시작했다. BladeRunner댓글4개·최상위2행·본문백업제거, origin없는preview동시20조회0.242초를확인했다. 이값은GitHub네트워크비용을포함한운영성능측정이아니다.

사용자결정없이Notion참조2개의대상이나과거외부404주소42개를추측해변경하지않는다. 운영API교체후캐시·동시조회·기존좀비해소확인, 실제신규댓글PR·승인·메일은별도대기다. 기존anyflow.net·DNS·Gateway·라우팅은유지한다.
