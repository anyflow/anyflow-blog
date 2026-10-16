# OPERATIONS

## 현재 단계

2026-10-14 사용자 요청으로 표시·작성 개선·OG·GA4 코드·댓글·Like와 과거 데이터 이관을 blog.anyflow.net 운영에 반영했다. 3단계 자동 배포 코드는 구현하고 자격증명·운영 활성화는 아래 자동 게시 절차를 따른다. anyflow.net 도메인 전환은 보류한다. RSS·sitemap은 추가하지 않는다.

운영은 GitHub Actions가 게시한 deployment/deployments.yaml의 GHCR digest를 사용한다. Kubernetes CronJob의 1분 pull·make deploy·성공 상태 기록을 활성화했고 실제 콘텐츠 push부터 rollout까지 확인했다. 기존 anyflow.net의 호스팅·DNS·Gateway listener는 유지한다. 최신 revision·검증 범위는 아래 운영 검증 기록을 따른다.

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

### 배포 갱신

GitHub Actions가 이미지를 빌드·GHCR 등록하고 배포 YAML을 갱신한다. 홈 서버에서는 이미지를 빌드하거나 kind load하지 않는다. 전용 checkout에서 make deploy를 실행하며 private GHCR Secret과 댓글 API Secret이 필요하다. 배포 실패·복구와 자동 게시 활성화는 아래 절차를 따른다.

root anyflow-blog-r은 삭제를 포함하므로 일반 갱신에 사용하지 않는다.

## 접근

- HTTPS: https://blog.anyflow.net/
- DNS: blog.anyflow.net -> anyflow.iptime.org -> 222.108.188.34
- TLS: Let Encrypt, cert-manager HTTP-01 challenge
- Gateway: public-gateway (cluster namespace), blog.anyflow.net listener
- HTTPRoute: anyflow-blog (service namespace)

## 검증 기준

전수 검증은 2026-10-14 사용자 요청으로 1회 수행했으며 반복하지 않는다. 이후 자동 배포·UUID·결함 수정은 변경한 부분의 관련 테스트와 대표 사례만 확인한다. 개인 vault의 NOW/NEW BLOG/blog 이전 TODO.md와 함께 관리한다.

- 기능별로 변경한 로직의 관련 테스트와 대표 사례만 확인한다. 새 복잡한 로직의 작은 테스트와 글 저장 시 데이터 손상 방지 확인을 유지한다.
- PC·모바일·라이트·다크는 해당 변경에 직접 영향을 받는 화면만 확인한다. 수정하지 않은 기능과 이미 통과한 화면을 반복 검사하지 않는다.
- 전체 글·원본 블록·본문 보존 대조, 전체 이미지 디코딩·자산 해시, 전체 공개 URL, 모든 화면 조합 검사는 최종 전수 검증으로 모은다.
- 미리보기 갱신에 필요한 빌드와 생성기의 기본 입력 검증은 유지한다. 매 기능마다 전체 회귀 테스트나 별도 콘텐츠 전수 검사를 실행하지 않는다.
- 미배포 작업에서는 운영 상태를 재확인하지 않는다. 실제 배포 시 상태·변경 파일·대표 동작만 확인한다.
- UI 자동화 도구 복구에 오래 매달리지 않는다. 실패하면 간단한 대체 확인 방법으로 전환한다. 별도 검수 보고서·JSON·스크린샷은 필요할 때만 남기고 기본 결과는 TODO에 기록한다.
- 최종 전수 검증에서 발견한 문제는 수정한 부분만 다시 확인한다. 전체 검증을 반복하지 않는다. anyflow.net 전환은 별도 승인을 받는다.

## 후속 단계

후속 작업:
- 3단계 GitHub runner·GHCR·배포 신호의 자격증명 등록·운영 활성화. 아래 자동 게시 절차를 따른다.
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

`Dockerfile`의 comments-api target과 `deployment/deployments.yaml`·`deployment/services.yaml`은 작성했으며 API 이미지는 미빌드·태그 pending이다. 데이터 작업 사본은 emptyDir에 복제하고 SSH 키·config JSON·known_hosts는 Secret에서 읽는다. Secret root 소유·0440·fsGroup 1000 조합을 사용한다. nginx는 공식 entrypoint가 `/etc/resolv.conf`의 DNS를 템플릿에 넣고 API hostname을 요청 시 해석한다. API Service 없이도 nginx가 시작되도록 `nginx -t` 1회 통과했다. 운영 apply·rollout·GHCR 등록·도메인 전환은 수행하지 않았다.

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

## 2026-10-14 감사 수정·Blade Runner 복원 운영 배포 완료

| 항목 | 확인 결과 |
| --- | --- |
| 게시 revision | 코드2b45cd1, 콘텐츠020cdb0, 추가댓글358c4b5. [댓글 게시 Actions](https://github.com/anyflow/blog-comments/actions/runs/38480149427) 성공 |
| 사이트 | ghcr.io/anyflow/anyflow-blog:release-20261014-2b45cd1, imageID sha256:b3b2b3ce61580eda936c700d9a7d583994a7d53329828bb96d019db6c214e43d |
| 댓글 API | ghcr.io/anyflow/anyflow-blog-comments:release-20261014-2b45cd1, imageID sha256:51215601c8a90baec3619116d46a1320501ea686fb56e631872a4fe8fee8d584 |
| 런타임 | kind 두 노드 이미지 적재, API→사이트 선언 apply·rollout 완료. 각각 Ready1/1·재시작0 |
| 운영 데이터 | Blade Runner4댓글 전부 published·preview=false, 비소유자 수정/삭제 불가, owner_hash/fingerprint·비공개 출처 세부정보 제외. source는 공개 provider 문자열만 제공 |
| 동시 조회 | HTTPS API20조회 모두200, 전체2.509초. 캐시·진행중조회공유 경로로 응답 |
| 프로세스 | 이전 API Pod종료, 새 API에서 조회 후 전체좀비0·Git좀비0 확인 |
| 본문·UI | 운영 표 multiline code8·literal BR0, AI글 가짜 파일명 링크0, Blade Runner본문백업 제거·댓글4개, 권한 안내 placeholder와 별도 안내행 제거 확인 |

검증한 정적 산출물과 공식 런타임에 최신 API 소스·공개 카탈로그를 패키징했다. Secret·설정·키는 이미지와 Git에 넣지 않았고 기존 권한·라우팅을 유지했다. GHCR 업로드와 정규 Dockerfile 전체 재빌드는 하지 않았다. 이전 이미지·Deployment 이력은 유지한다.

기존 anyflow.net·DNS·Gateway·HTTPRoute는 변경하지 않았다. Notion 대상불명 참조2개·과거 외부404링크42개는 사용자결정대기를 유지한다. 실제 신규댓글 PR·승인 OFF/ON·메일 수신과 보류3단계는 남긴다. 관련 변경만 확인했으며 전체 전수 검증은 반복하지 않았다.

## 2026-10-14 관리자 고정 정보·작성창 운영 반영 완료

- 코드 c45695c, 콘텐츠 020cdb0으로 사이트·API release-20261014-c45695c를 패키징해 kind 두 노드에 적재하고 API→사이트 순으로 선언 apply·rollout을 완료했다.
- 사이트 imageID: sha256:2f26b0de5eed3fbf9ad2d8c8eb278e597aecb546390a4637aef56c6766b818a1. API imageID: sha256:1d866a1632390066431897368179cbe67b810acbb60761c5218f5398f9fce3a8. 각 새 Pod Ready1/1·재시작0을 확인했다.
- 관리자 로그인 시 이름·링크 입력을 숨기고 disabled 처리하며 새 댓글·답글은 서버의 Hyunjeong Park·https://www.anyflow.net 정보를 사용한다. 관리자 수정은 작성자 필드를 보내지 않아 원래 작성자 정보를 유지한다. 방문자는 기존 브라우저 소유권 규칙을 유지한다.
- 관련3개 테스트가 통과했다. 실제 운영 키는 값 출력 없이 메모리에서 읽어 독립 세션2개의 로그인·GET관리권한·로그아웃을 확인했다. 운영 댓글은 작성·수정·삭제하지 않았다. 현재 Chrome 관리자 세션에서 새 댓글창과 수정창의 identity hidden/disabled와 필수값 해제를 확인하고 수정창은 취소했다.
- 기존 Secret·토큰·방문자 권한·anyflow.net·DNS·라우팅을 유지했다. GHCR 업로드·전체 전수 검사·운영 댓글 수정/삭제 쓰기 시험은 수행하지 않았다. 독립 브라우저 수정/삭제와 작성자 보존은 격리된 API 테스트로 확인했다.

## 2026-10-14 Notion·외부 참조 복구 — Git 게시·미리보기, 운영 대기

콘텐츠1e2ebed를 게시했다. Agile 표의 OCP는 기존글의 상대경로로 연결하고 DNS caching 설명의 대상불명 참조구절만 제거했다. 외부42개는 동일자료의 검증된 새주소·고정Git이력24개와Wayback8개로32개를 복구하고,같은자료를확정못한10개는원URL을보존했다. 판·번역자·ISBN·역사문서버전·anchor를대조하고다른자료나사이트홈으로임의교체하지않았다.

외부수정22파일(21MD·1HTML첨부),Notion수정2MD의대상링크를바꿨다. 표시문구·코드·본문·이미지는유지했고HTML첨부의Tweet링크1개는href만변경했다. 미리보기397글·879자산·미해결0으로빌드했다. 수정24페이지/첨부는HTTP200,대체32URL은모두렌더링됐고이전대상href는남지않았다. 네트워크연구결과와보존사유는Mac outputs/blog 전수 검증/link-repair-results.json 및 링크 복구 결과.md를따른다. 일부외부사이트는후속요청403일수있어항상접근을보장하지않는다.

코드·문서commit/push와미리보기까지만수행한다. 운영이미지·Deployment·라우팅·댓글데이터는변경하지않고 release-20261014-c45695c를유지한다. 전체전수검증은반복하지않았다.

## 2026-10-14 링크 복구 운영 배포 완료

코드3b63703·콘텐츠1e2ebed의 검증된 _preview 정적 결과와 nginx 설정을 ghcr.io/anyflow/anyflow-blog:release-20261014-3b63703으로 패키징하고 kind 두 노드에 적재했다. imageID는 sha256:6c8cc1032e650c9db7924e9fe8acbd8896646a03db859d7efb367ce99d943e37다. Deployment 선언 apply·rollout 완료, 새 Pod anyflow-blog-76444df564-ghnww Ready1/1·재시작0을 확인했다.

운영 HTTPS에서 변경24개 페이지/첨부가200이고 외부32개 복구 주소가모두href에반영되며 이전대상href는없음을 확인했다. Agile OCP연결·DNS불명참조제거도 확인했다. 원문보존10개·원래표시문구·첨부본문은 유지한다. API이미지 release-20261014-c45695c,댓글데이터·권한·기존anyflow.net·DNS·Gateway·HTTPRoute는변경하지않았다.

GHCR 업로드·정규 Dockerfile 전체 빌드·전체 전수 재검증은 수행하지 않았다. 링크가 바뀐 범위만 확인했으며 기존 이미지·Deployment 이력은 보존한다. 새 외부주소의 본문 동일성·버전·anchor 확인 근거는Mac outputs/blog 전수 검증/링크 복구 결과.md에 기록한다.

## 2026-10-14 manifest 파일 구조 정리

Service2개를 deployment/services.yaml, Deployment2개를 deployment/deployments.yaml에 종류별로 모았다. httproute.yaml과 nginx.conf는 유지한다. Makefile은 Services→Deployments→HTTPRoute 적용 후 두 rollout을 확인하고, 이미지 값은 Deployment의 metadata.name별로 읽는다. delete/recreate는 기존처럼 정적 블로그 Service·Deployment와 HTTPRoute만 제거하므로 댓글 API까지 삭제하지 않는다. 이번 작업에서 delete/recreate를 실행하지 않는다.

원본4개와 통합4개의 parsed YAML 객체가 완전히 같고 kubectl diff는0이다. make -n build/load/deploy/delete에서 기존 사이트·API 이미지 추출과 명령 경로를 확인했다. 새 이미지·미리보기 빌드·전수 검사는 필요하지 않아 생략한다. 코드0f6b0e7를 commit·push하고 make deploy로 운영 적용했다. Services·Deployments 4개는 unchanged였고 두 rollout이 성공했다. 기존 Makefile 순서에 따라 httproute도 재적용했다. 적용 전후 두 Pod의 UID·이미지·재시작 수가 동일하며 Ready1/1이다. 운영 블로그 HTTPS200·댓글API HTTPS200·Blade Runner댓글4개·preview=false를 확인했다.

## GitHub Actions·Kubernetes CronJob 자동 게시

콘텐츠 push는 이미지 게시를 시작하고, Kubernetes CronJob은 Git에 기록된 배포 상태를 1분마다 확인한다. 블로그 운영 도메인은 blog.anyflow.net이며 기존 anyflow.net은 유지한다.

| 단계 | 동작 |
| --- | --- |
| 콘텐츠 trigger | anyflow/blog main push → anyflow/anyflow-blog publish.yml workflow_dispatch |
| 빌드 | GitHub 제공 runner, 고정 콘텐츠·코드 SHA, linux/amd64 정적 이미지 |
| API·배포 도구 | 코드 push에서 별도 생성. 콘텐츠 push는 정적 이미지만 생성 |
| 게시 | GHCR 업로드 성공 후 deployments.yaml·cronjob.yaml의 해당 image digest commit·push |
| 변경 감지 | deployment/cronjob.yaml의 anyflow-blog-deploy, 매분 Git fetch·ff-only |
| 적용 | 마지막 성공 deployment tree와 다를 때 make deploy·rollout 대기 |
| 상태 | anyflow-blog-deploy-state PVC의 checkout과 last-success. 성공 후만 marker 갱신 |
| 실패·중복 | Forbid·flock으로 중복 차단. 실패는 다음 주기에 재시도 |

Actions 성공은 이미지·배포 선언 게시까지다. 실제 운영 반영 성공은 CronJob 로그의 Deployment completed와 Deployment Ready로 확인한다. 빌드·업로드 실패는 Git의 배포 버전을 바꾸지 않는다. 실패한 rollout은 성공 marker를 갱신하지 않으며, 다음 실행에서 같은 목표를 재시도한다. 서버가 복구되면 다음 주기에 최신 Git을 확인한다. Git 변경 없이 발생한 수동 운영 drift는 자동 복구하지 않는다.

빌드 직전·게시 직전에 최신 콘텐츠와 코드를 확인해 오래된 산출물의 게시를 차단한다. 배포 YAML 변경만으로 이미지 빌드를 반복하지 않는다. 배포 도구 이미지는 별도 Dockerfile.deploy와 cronjob.yaml digest로 관리한다. Kubernetes 1.35에 맞는 kubectl 1.35.0은 공식 SHA256을 검증해 이미지에 넣는다. 원격 Docker 빌드 캐시 export는 사용하지 않으며 같은 runner 작업 내 빌드 캐시는 재사용한다.

### 자격증명과 권한

토큰은 만료 없음으로 발급했으며 값은 Git·이미지·로그에 넣지 않는다.

| 대상 | 설정 |
| --- | --- |
| 콘텐츠 repo BLOG_PUBLISH_TOKEN | 코드 repo 한 곳의 Actions 읽기·쓰기. 등록 완료 |
| 코드 repo BLOG_CONTENT_READ_KEY | 콘텐츠 repo 전용 읽기 deploy key. 등록 완료 |
| service/anyflow-blog-registry | GHCR read:packages 전용 imagePullSecret. 등록 완료 |
| service/anyflow-blog-deploy-git | 코드 repo 전용 읽기 SSH deploy key와 GitHub 공식 known_hosts. 등록 완료 |
| CronJob ServiceAccount | service의 기존 블로그 Service·Deployment·HTTPRoute·CronJob 이름만 get·patch·update, rollout용 제한 list·watch |
| Bootstrap | SA·Role·RoleBinding·PVC는 관리자 make deploy-automation으로 설치하며 CronJob에 해당 권한을 주지 않는다 |

CronJob에는 Secret 조회·수정 권한이 없다. Git 키는 읽기 전용 volume, registry 인증은 imagePullSecret을 사용한다. 컨테이너는 UID1000·readOnlyRootFilesystem·capabilities drop ALL로 실행한다. HOME과 임시 파일은 emptyDir, checkout·성공 상태는 PVC에 보관한다. 호스트 cron·OpenRC 배포 수신기·공개 배포 API·HMAC 인증은 사용하지 않는다.

### 설치·확인·복구

초기 설치는 registry·Git Secret을 먼저 준비하고 GHCR에 존재하는 도구 digest를 cronjob.yaml에 기록한 뒤 make deploy-automation을 실행한다. 기본 make deploy는 앱과 CronJob을 적용하며 RBAC·PVC를 변경하지 않는다. 호스트에서는 kind-my-cluster context, Pod에서는 in-cluster ServiceAccount를 사용한다.

- 수동 게시: gh workflow run publish.yml -R anyflow/anyflow-blog. API·도구 재게시가 필요하면 build_comments=true·build_deployer=true를 지정한다.
- 즉시 poll: kubectl -n service create job --from=cronjob/anyflow-blog-deploy anyflow-blog-deploy-manual-UNIQUE.
- 결과: kubectl -n service logs job/JOB_NAME 및 Job 상태를 확인한다. 상시 실행 Pod는 두지 않는다.
- 롤백: 실행 중인 게시 workflow를 중단하고 YAML의 image digest를 이전 버전으로 되돌려 push한다. 다음 poll이 이전 tree를 적용한다.
- 실패: Job 로그를 확인해 인증·Git·이미지 pull·apply·rollout 원인을 해결한다. 성공 marker는 유지되므로 다음 주기에 재시도한다.
- 권한·PVC 변경: 관리자 make deploy-automation을 다시 실행한다. 이 변경은 CronJob이 자동 반영하지 않는다.

검증은 변경 없음·변경 감지·Git/배포 실패 후 재시도·동시 실행 방지·이전 tree 복구의 관련 테스트와 실제 Actions→Git→CronJob→rollout 대표 경로를 사용한다. 전체 콘텐츠·회귀·전수 검증은 반복하지 않는다.

## 2026-10-15 pull 배포 운영 검증 완료

코드 308875b·콘텐츠 workflow 7058cd3을 게시하고 Kubernetes CronJob을 활성화했다. 콘텐츠 [push workflow](https://github.com/anyflow/blog/actions/runs/38612727499)가 [이미지 게시 workflow](https://github.com/anyflow/anyflow-blog/actions/runs/38612743961)를 호출했고 배포 선언 27ff214의 정적 image digest만 갱신했다. 댓글 API·배포 도구 이미지는 유지했다.

| 확인 | 결과 |
| --- | --- |
| 첫 이미지 게시 | [38612314145](https://github.com/anyflow/anyflow-blog/actions/runs/38612314145), 정적·API·도구 GHCR 업로드와 YAML 자동 commit 0c420a4 성공 |
| 캐시 개선 실측 | 정적 단계 42초, 도구 포함 전체 1분41초. 기존 정적 단계 2분18초의 캐시 export 대기를 제거 |
| 콘텐츠 push 경로 | push 이벤트 18:09:16 UTC → YAML 갱신 18:10:48 → CronJob 시작 18:11:00 → 완료 18:11:43, 총 2분27초 |
| 운영 Job | anyflow-blog-deploy-29866691 Complete, 두 rollout 성공, deployment tree 44c9c48ff309fee93d613a15a708f4a4b035e33a 저장 |
| 변경 없음 | 후속 Job에서 Deployment unchanged, 재배포 생략·PVC 상태 유지 |
| 운영 이미지 | 두 Deployment의 spec image가 게시 YAML digest와 일치, updated=available=1·observedGeneration 일치 |
| RBAC | 지정 Deployment·CronJob patch/watch 허용, 댓글 Secret get·다른 Deployment patch·Role patch·Deployment create 거부 |
| HTTPS | 홈 200, 공개 홈 댓글 조회 200·30개 레코드, 기존 미리보기 200 |
| 관련 테스트 | 9개, 실패 후 재시도·이전 tree 복구·동시 실행·잘못된 Git 대상 차단 포함. workflow lint·manifest 파싱·호스트/Pod make dry-run 통과 |

시각 콘텐츠를 바꾸지 않고 콘텐츠 workflow 파일의 push로 공통 게시 경로를 검증했다. 운영에서 잘못된 image를 배포하는 실패 실험이나 실제 롤백은 수행하지 않았으며 해당 분기는 격리된 테스트로 확인했다. 로그는 .cache/cron-validation/anyflow-blog-deploy-29866691.log에 보존했다. 기존 anyflow.net·DNS·Gateway listener는 변경하지 않았고 전체 회귀·전수 검증은 반복하지 않았다. Obsidian의 수동 commit 후 자동 push는 별도 TODO로 유지하며 현재 자동 게시 시작점은 GitHub push다.

## 2026-10-15 커버 중앙 자동 배치

웹은 홈·글 모두 커버를 50% 50%로 배치하고 이전 좌표를 무시한다. 작성 vault의 398개 문서에서 좌표 속성만 제거하며 본문을 유지하고 기존 Istio 커버 수정은 별도 미커밋으로 보존한다. Pixel Banner 전역 x/y50과 선택 후 위치 조절 창 OFF를 사용한다. 관련4개 테스트·대표 홈/라이프치히 미리보기 coverLoaded 및 objectPosition50%50%를 확인했다. 미리보기 빌드397글·879자산·미해결0이며 전수 검증은 반복하지 않았다. 코드 commit은 CI를 건너뛰고 이어지는 콘텐츠 push로 정적 이미지 한 번만 생성한다.

코드8bccd0f·콘텐츠40dc8ed를 게시했다. Actions38623207610 성공과 자동 배포 선언920207c의 정적 digest 일치·updated/available1·generation 일치를 확인했다. 운영 홈 커버 loaded 및 objectPosition50%50%를 확인했다. 콘텐츠 commit은 원래 Git 버전에서 좌표만 제거해 구성했으며 작업 중 바뀐 국토 종주 초안 상태·기존 Istio 커버 선택·Notion import 검증 자료는 미커밋으로 보존했다. 기존 anyflow.net은 유지한다.

## 2026-10-15 대표 URL·관리자 키 운영 반영

코드22a309a의 [Actions](https://github.com/anyflow/anyflow-blog/actions/runs/38676401611)가 성공했고 배포 선언15ed5c6의 정적·댓글 API digest를 운영에 반영했다. site.url=https://anyflow.net이며 홈과 Kubernetes Gateway API 글의 canonical·og:url을 확인했다. 미리보기에도 같은 설정을 빌드했다. 공유 버튼은 현재 브라우저 주소를 사용하며 www·blog redirect는 이번 범위에 포함하지 않았다.

운영 Secret의 config.json에서 관리자 키만 교체하고 서명 secret·Git 키·다른 항목을 보존했다. API 새 버전 배포 후 Secret 교체·rollout restart를 수행했다. 새 키 로그인200·이전 키401·이전 쿠키 권한 없음·검증 세션 로그아웃을 확인했다. 복구용 설정은 비추적 .cache/admin-rotation/config.before.json에0600으로 보관하며 키·쿠키 값은 Git·문서에 넣지 않는다. 관련 테스트3개만 실행했고 전체 회귀·전수 검증은 반복하지 않았다. 2026-10-15 기존 GA4 속성333773406의 실시간 page_view → page_location에서 운영 검증 URL https://anyflow.net/blog-construction/prepare?ga_verify=20261015-check-1과 이벤트1건 수신을 확인했다. 운영 페이지 측정 ID는 G-YWPHXJFYET이며 태그 설정·시험 이벤트를 추가하지 않았다.

## 2026-10-15 댓글·Like 비동기 접수

- `QueueStore`가 기존 API 프로세스 안에서 실행된다. 별도 DB·Redis·프로세스·Pod는 없다. 방문자의 HTTP 요청은 검증·권한 확인 후 PVC의 `queue/queue.json`에 기록하고 파일 fsync → atomic rename → 디렉터리 fsync가 끝나야202를 반환한다. 큐 파일은0600이며 Git 작업 사본 밖에 둔다.
- 큐는 최종 Git 스냅샷, 미완료 작업, 접수/완료 영수증, Like 요청 순서를 보존한다. 브라우저는 작업 큐를 보관하지 않는다. 화면은 즉시 바꾸며 `저장 중`은 접수 전, `게시 처리 중`은 접수 후 Git/PR 처리 중, `승인 대기`는 관리자 승인 ON인 경우다.
- 단일 async 처리기가 현재 대기 작업의 고정 batch를 순서대로 적용한다. Git 작업 중 새 요청은 다음 batch에 들어간다. 같은 batch의 main 변경은 한 commit·push로 저장한다. 신규 댓글의 incoming 브랜치·PR·승인·알림 경로는 유지하므로 각 신규 댓글의 review 브랜치 push는 별도다.
- 모든 변경 요청의 `request_id`는 같은 브라우저 내 중복을 방지한다. 같은 ID에 다른 내용을 보내면409다. Like는 명시적 `liked`와 페이지별 `client_id`·대상별 증가 `sequence`를 사용하며 네트워크 순서가 뒤집혀 도착한 과거 의도는 superseded로 처리한다. 이미 진행 중인 저장은 취소하지 않는다.
- 작성 시 접수 응답에 실제 댓글 ID와 version을 반환한다. 이 ID로 Git 완료 전에도 후속 수정·삭제·답글을 접수한다. 접수 전 임시 행은 변경을 허용하지 않는다. 수정·삭제의 `expected_version`이 다르면409이며, Git 처리 시 외부 변경과 충돌하면 해당 작업만 failed로 기록한다. 독립 작업은 계속 처리한다.
- GET·접수 응답은 로컬 상태와 revision·작업 상태를 제공한다. 오래된 revision/인증 상태 응답은 최신 화면을 덮지 않는다. Git mirror가 오래됐으면 먼저 로컬 응답을 반환하고 `refreshing` 신호로 새 스냅샷을 한 번 더 조회한다. 진행 작업과 신규 PR 공개 확인 동안만 폴링하며 idle 폴링은 없다.
- Git 장애는 작업을 지우지 않고 자동 재시도한다. 재시작은 PVC의 미완료 작업을 다시 소비한다. 댓글 자체의 applied_requests는 Git 성공 직후 API가 강제 종료되어도 수정·삭제를 중복 적용하지 않게 한다. 공개 API·export에는 소유권 hash·receipt·내부 review 속성을 내보내지 않으며 관리자 작업의 영수증은 로그아웃하면 숨긴다.
- 운영 저장은 `anyflow-blog-comments-state`1Gi PVC의 `/data/repository`와 `/data/queue`다. API Deployment는1 replica·Recreate로 동시 소비를 막는다. 신규 PVC는 기존 관리자 `make deploy-automation`으로 bootstrap하며 CronJob 권한은 넓히지 않는다. PVC는 `make delete`에서 삭제하지 않는다. old API로 rollback할 때는 미완료 큐를 먼저 비우거나 큐 호환 버전으로 되돌려야 한다.
- Git 전용 checkout은 큐에 접수 내용이 보존되어 있으므로 강제 종료로 남은 comments/likes/public/requests 작업 파일만 복구하고 replay한다. 일반 GitStore의 미저장 변경 보호는 유지한다. 운영 Secret·쿠키·댓글 저장소와 사이트 도메인·라우팅은 변경하지 않는다.

최종 확인: 관련 테스트59개(큐·HTTP·UI·Git·배포 선언/폴러), Git 차단 중 즉시 접수, 연속/역순 Like·작성→수정→답글→삭제·중복·권한·version 충돌·디스크 실패·Git 장애·SIGKILL 복구·Git 성공 후 ACK 전 중단·review 분리·로그아웃 후 늦은 응답·초기 mirror refresh를 검증한다. 실제 미리보기의 작성·답글·수정·연속 Like·삭제도 확인했으며 시험 댓글은 삭제했다. 전체 콘텐츠 전수 검증은 반복하지 않는다.

코드ec12b58·[Actions38719434788](https://github.com/anyflow/anyflow-blog/actions/runs/38719434788)·배포 선언19f5aff를 게시했다. 정적·API rollout 완료, API Ready1/1·Recreate, 댓글 PVC Bound1Gi·큐0600·미완료0을 확인했다. 운영 GET200·preview=false·revision/tasks/refreshing 응답과 새 UI 코드를 읽기 검증했다. 관련59테스트 통과, Git 차단 HTTP 접수 작성26.2ms·수정21.5ms·삭제26.2ms는 격리 시험 수치이며 운영 쓰기 성능 실측이 아니다. 실제 preview 시험 댓글2개는 삭제했고 Like는 원래 상태로 복원했다. 운영 댓글·Like 쓰기 및 실제 알림 메일 재발송·전체 콘텐츠 전수 검증은 수행하지 않았다.

## 2026-10-15 www 대표 주소·자동 사이트맵

대표 주소는 https://www.anyflow.net이며 canonical·OG·sitemap·robots는 site.url을 따른다. sitemap.xml은 매 빌드에서 현재 공개 posts와 홈으로 재생성하며 noindex 글은 제외한다. 발행·삭제·draft 전환·permalink 변경은 사이트와 같은 배포에 반영한다. sitemap lastmod는 검증 가능한 수정일이 없어 넣지 않는다. RSS는 추가하지 않는다.

anyflow.net의 공개 페이지·정적 파일은 경로와 query를 유지해 www로301 이동한다. 기존 열린 페이지와 방문자 식별 이전을 위해 /api/는 apex에서도 유지한다. www 댓글 초기화는 apex /api/identity-migration을 credential 포함 GET으로 호출한다. 이 endpoint는 www Origin만 허용하고 기존 방문자 식별값을 HttpOnly·Secure·SameSite=Lax·Domain=anyflow.net·Path=/api의 별도 cookie로 이전한다. 기존 www cookie를 덮어쓰지 않으며 두 식별 hash의 댓글 소유권·대기 댓글·Like·작업 영수증을 함께 인식한다. Like ON은 기존 식별값 중 하나가 이미 누른 경우 중복 추가하지 않고 OFF는 자신의 이전/현재 식별값 모두 취소한다. 서명 secret·관리자 키·관리자 인증 cookie는 이전하지 않는다. apex에서만 로그인했던 관리자는 www에서 다시 로그인한다.

관련 테스트44개와 XML 파싱·www URL/중복 검사·nginx syntax를 확인했다. 미리보기 sitemap은397 URL이며 draft/noindex/삭제/주소 변경은 작은 fixture의 연속 재생성으로 검증했다. 전수 콘텐츠 검증은 반복하지 않았다. Search Console의 기존 sc-domain:anyflow.net 속성에 www 사이트맵이 이미 등록되어 있어 운영 배포 후 같은 URL을 재제출한다.

코드067c89b·[Actions38721591107](https://github.com/anyflow/anyflow-blog/actions/runs/38721591107)·배포 선언659d3cd의 정적·API rollout을 완료했다. 운영 sitemap.xml200·text/xml·397개 고유 www URL, robots 안내, 대표 글 canonical/OG의www 일치를 확인했다. apex 홈·글(query 포함)·sitemap의301 Location이 동일 경로/query의www를 가리킨다. 운영 identity-migration204·www CORS·Secure/HttpOnly/Domain/Path 속성과 관리자 cookie 미이전을 dummy visitor로 읽기 검증했다. 실제 댓글/Like 데이터는 변경하지 않았다.

기존 Search Console sc-domain:anyflow.net 속성에 https://www.anyflow.net/sitemap.xml을 재제출했고 ‘사이트맵이 제출됨’ 접수 확인과 제출일2026-10-15를 확인했다. 마지막 읽기2026-10-14·발견397은 기존 결과이므로 새 sitemap의 Google 재수집/재색인 완료로 주장하지 않는다. 전체 전수 검증은 반복하지 않았다.

## 2026-10-16 모든 카드 이미지의 OG 연결

사진·직접 선택한 thumbnail·YouTube·X·cardlink 이미지는 홈 카드와 동일한 URL을 og:image에 사용한다. 선택된 Mermaid·SVG·ICO·AVIF는 lib/card-images.js에서 PNG1200×630으로 생성하며 같은 Mermaid vendor 엔진·한글 폰트·strict 모드를 사용한다. 홈/본문의 Mermaid 렌더링과 테마 전환은 유지한다. 사용자가 새 속성을 입력할 필요는 없다. 카드 이미지가 없으면 기존 글 커버→홈 커버 대체를 유지한다.

렌더링은 GitHub 제공 runner의 Chrome에서 수행하고 생성물 _site만 Docker 이미지에 패키징한다. Dockerfile 직접 실행 전에도 npm run build로 _site를 준비해야 한다. 브라우저·렌더링 의존성은 운영 nginx/댓글 API 이미지에 포함하지 않는다. renderer+vendor+입력 내용 기준으로 PNG 캐시를 재사용하며 Actions에 PNG·기존 X 썸네일 캐시를 보관한다. 공개 PNG URL은 실제 이미지 bytes hash다. 렌더 중 네트워크 요청을 차단하고 외부 SVG 입력은 HTTP(S)·크기·시간 제한으로 읽는다. 생성 실패는 기존 배포를 유지하며 잘못된 이미지로 새 배포하지 않는다.

관련11테스트, 실제 PNG5개(Mermaid3·SVG2)의1200×630·본문 선택/OG 연결, YouTube(폴스타4)·X(Mike Portnoy) 이미지200/image/jpeg를 확인했다. PromLabs bookmark cover의 이전404 주소는 현재 공식 사이트의 동일 favicon /favicon.svg로2개 metadata 기록을 수정했다. 작성 vault의 다른 편집은 포함하지 않는다. 전체 콘텐츠 전수 검증은 반복하지 않는다.

코드c85e775·콘텐츠5761ab2를 게시했다. 콘텐츠 [Actions38774626061](https://github.com/anyflow/blog/actions/runs/38774626061)가 코드 [Actions38774640449](https://github.com/anyflow/anyflow-blog/actions/runs/38774640449)를 호출했고 새 runner artifact 빌드·이미지 패키징·배포 선언6bf6742의 정적 rollout이 성공했다. 댓글 API·배포 도구 이미지·라우팅·인증 정보는 유지했다. 미리보기도 같은 콘텐츠5761ab2로 동기화했고 이전 untracked bookmark catalog는 .cache/bookmarks-before-sync-*에 보관했다. 미리보기는396글·872참조 자산·미해결0이다.

운영에서 Mermaid3·SVG2의 OG PNG200/image/png·1200×630, YouTube·X의 홈 카드 src와 OG URL 동일성·이미지200/image/jpeg를 확인했다. Obsidian Auto Card Link Enhanced로 실제 AI 플랫폼·폴스타4·Mike Portnoy 글 링크를 카드로 변환해 생성 PNG·YouTube·X 이미지가 들어가는 것도 확인했다(메모리 편집기 사용, 실제 글 수정 없음). 실제 캐시 재사용 확인은 PNG5개·재렌더0이며 전수 콘텐츠 검증은 반복하지 않았다. 외부 서비스의 기존 링크 미리보기 캐시는 별도 재수집 때 갱신된다.


## 2026-10-16 Mermaid 라이트 배경

공통 .mermaid와 확대 SVG의 라이트 배경을 페이지와 같은 #fff로 변경했다. 다크는 기존 #202020, 그림 내부의 명시된 색상과 이미 흰색인 OG 캔버스는 유지한다. 코드7f39462·[Actions38776296573](https://github.com/anyflow/anyflow-blog/actions/runs/38776296573)·배포 선언3a1051b의 정적 rollout을 완료했다. 미리보기의 라이트/다크 전환·확대 배경과 운영 AI 플랫폼 글의 Mermaid3개 흰색 배경을 확인했다. 댓글 API·배포 도구는 갱신하지 않았고 전수 검증은 반복하지 않았다.


## 2026-10-16 Notion 원본 문단 간격

사용자가 지정한 Notion k8s workload 1/2 원본의 일반 텍스트 블록은 바깥 padding6px+내부 padding2px로 위아래8px, 문단 간 총16px다. 공통 .post-body p를 margin0·padding8px 2px로 맞춰 기존8px에서16px로 변경했다. 본문 line-height24px와 이미지·caption·목록의 별도 padding 규칙은 유지한다. 코드77255b4·[Actions38777535376](https://github.com/anyflow/anyflow-blog/actions/runs/38777535376)·배포 선언8676980의 정적 rollout을 완료했다. 원본 DOM 측정과 해당 글 미리보기·운영의 margin0/padding8px/line-height24px를 확인했다. 전수 검증은 반복하지 않았다.


## 2026-10-16 Markdown·중복 이미지 정리

일반 강조3020곳을 ** 문법으로 변환하고 표시 보존이 필요한 HTML 강조150곳은 유지했다. 코드/fence·HTML 블록은 건드리지 않으며 수정303글의 본문·인라인 렌더링·목록 계층을 변환 전후로 비교했다. 단순 목록 항목 사이 빈 줄2150개를 제거하고, 순서 목록은 실제 MD에서도 순차 번호를 기록한다(68글436항목 번호 수정). 복합 항목의 문단·코드·하위 목록 구분은 유지한다. 관련8개 시험과 번호 정리의 중첩/인용/코드 fixture·구조 동등성 검증을 통과했다.

동일 폴더 PNG/JPEG와 Notion WebP를 그림 비율·픽셀 차이로 대조해376쌍을 확인했다. 구조도를 제외한375쌍은 WebP를 유지하고 이전 파일 참조를 교체했다. OpenAPI endpoint filter 글의 구조도 PNG/WebP와 본문·hero_image 참조를 제거했다. 작성 vault에서 총377개 파일을 ~/.Trash/anyflow blog image cleanup 20261016에 보관했다. 내용이 다른 이미지·애니메이션·불확실한 대응은 삭제하지 않는다.

콘텐츠7a18a9d·80869d4와 코드4406931을 게시했다. 향후 Notion 재가져오기는 하지 않으며 import-notion/audit-import/notion-metadata 및 이관 전용 formatter·시험을 제거했다. [Actions38781387444](https://github.com/anyflow/anyflow-blog/actions/runs/38781387444) 성공과 배포 선언6cf5b2a의 정적 rollout을 확인했다. 미리보기396글·869참조 자산·미해결0, 운영 OpenAPI 구조도 제거와 Istio 번호 목록을 확인했다. 댓글 API·배포 도구 이미지는 유지했다.

작성 vault HEAD/main과 origin/main은80869d4로 맞췄다. 기존 작성 중이던 OpenAPI 글의 수정은 보존했고 이번 콘텐츠 commit에는 포함하지 않았다. 게시본과 다른 MD는 이 글 하나뿐이다. Mac의 iCloud Git 객체 읽기 지연으로 게시 commit의 증분 pack을 가져와 Git 참조·index만 동기화했으며 working tree는 교체하지 않았다. 전체 콘텐츠 회귀·시각 전수 검증은 반복하지 않았다.


## 2026-10-16 홈 Markdown 작성 원본

홈 blog.md를 kind:root로 게시하며 제목·summary·소개 문구·연락처·소개 카드 링크·본문 제목·섹션 순서·목차를 Markdown에서 읽는다. 기존 최근 포스트.csv/Blog.csv 독립 링크 위치에 동적 카드/카테고리 목록을 렌더링하며 CSV는 공개하지 않는다. 템플릿에 중복되던 홈 본문과 목차 문구는 제거했다. 소개 카드 이미지는 연결 글의 선택/자동 thumbnail 우선·없으면 cover이며 데스크톱에서 연락처 목록과 같은 높이를 유지한다. 기존 who-and-why/recent/by-category 영역의 앵커를 보존한다.

코드87caefc·콘텐츠437dd4e를 게시했다. 관련6개 시험으로 제목/본문/연락처/목차 편집, 목록 순서 변경, 중복 목록 거부, root 댓글 이관 카탈로그, OG·커버·favicon을 확인했다. 미리보기396글·869참조 자산·미해결0과 소개 카드 썸네일·양쪽 높이97px를 확인했다. [Actions38823025196](https://github.com/anyflow/anyflow-blog/actions/runs/38823025196) 성공·배포 선언d49cd97의 정적 rollout 완료 후 운영 제목/목차3개·썸네일 경로·동일 높이97px를 확인했다. 댓글 API·배포 도구 이미지는 갱신하지 않았으며 전체 회귀/전수 시각 검증은 반복하지 않았다. 향후 홈 콘텐츠 변경은 blog.md commit/push 후 같은 자동 빌드/배포를 따른다.


## 2026-10-16 댓글 백업 전수 조사·Unthinkable 복원

공개396글+홈(397페이지)의 백업 inventory와 전체 작성 Markdown의 한글/영문 백업 표기, 기존 이관 이미지 경로를 대조했다. 남은 미처리 백업은 Unthinkable 1블록/1이미지였다. 기존 인식기가 한글 댓글 백업만 허용해 댓글 backup을 놓쳤고 Markdown 강조 구분자도 제거하지 않았다. English backup·대소문자·Markdown 강조·기존 inline HTML을 처리하며 일반 본문/다른 제목은 제외하도록 보완했다. 관련 제목 판별2개 시험을 통과했다.

illef 원댓글(2010-08-05 13:57)과 어쨌건간에 관리자 답글(14:40)을 원본 이미지와 대조해2개 복원했다. 날짜는 원본 현지 시각/분 정밀도·timezone:null로 보존하며 추정하지 않는다. source ID로 중복을 막고 기존 댓글·Like·설정은 GitStore transaction에서 유지했다. 댓글 비공개 commit d523b5e, 원본 MD·이미지·검토 JSON·블록은 private originals/import-20261016-unthinkable에 보관했다. 작성 vault의 백업 이미지는 휴지통에 보관했고 본문 백업을 제거했다. 작성 안내의 오래된 Cassandra 백업 유지 문구도 갱신했다.

현재 공개 백업 블록0, 이관된 백업 이미지51경로 중 vault에 남은 파일0이다. 미리보기396글·868참조 자산·미해결0과 댓글2/답글1을 확인했다. 코드41dd1a3·콘텐츠4213bd1을 게시했고 [Actions38824043928](https://github.com/anyflow/anyflow-blog/actions/runs/38824043928) 성공·배포 선언a2e6cfb의 정적 rollout을 완료했다. 운영에서도 본문 백업 없음·이전 이미지404·댓글2/답글1·작성자/시각/본문·답글 계층을 확인했다. 공개 source 필드는 provider 이름뿐이며 private 원본 경로/owner_hash는 노출하지 않는다. 댓글 API·배포 도구 이미지는 유지했으며 댓글 백업 외 기능의 전수 회귀 검증은 수행하지 않았다.


## 2026-10-16 Obsidian 강조 혼용 정리

HTML em/strong과 Markdown 강조·인라인 코드가 섞인102개 후보 문서를 읽고80개를 정리했다. 가능한919개 강조 표시는 Markdown으로 옮기고235개 HTML 혼용은 내부까지 HTML로 렌더링해 일관되게 만들었다. 구두점/한글 경계 등에서 Markdown 결과가 달라지는 정상 HTML 강조는 유지한다. 코드 fence·코드 블록·HTML 블록·문서 속성을 보존했다. 변경 문서의 본문/강조 의미를 DOM 기반으로 대조했고 정리 후 실제 HTML 강조 안에 Markdown 강조·코드·링크 token이 남은 경우는0이다. 변환기는 .cache의 일회성 작업이며 새 영구 importer는 추가하지 않았다.

실제 Obsidian 읽기 보기에서 Concurrency/Codebase/Build release run의 굵게+기울임, 별표 문자 미노출, stdout의 HTML strong+code 표시를 확인하고 기존 보기로 복귀했다. 콘텐츠5aa8705 commit/push, 미리보기396글·868참조 자산·미해결0, [Actions38825542967](https://github.com/anyflow/anyflow-blog/actions/runs/38825542967) 성공·배포 선언e66a8d8의 정적 rollout과 운영 Twelve Factor2의 강조/인라인 코드를 확인했다. 작성 vault는 clean이며 댓글 API/배포 도구 이미지는 유지했다. 다른 기능의 전수 회귀·시각 검증은 반복하지 않았다.

멀티미디어 캡션은 제안 단계다. 이미지/Mermaid/영상/오디오/외부 임베드 뒤의 명시적 [!caption] callout만 캡션으로 연결하고 일반 문단 추측은 하지 않는 안을 제시했다. 스타일은13px·italic·테마 회색·미디어 아래4px·후속 본문과12px, Obsidian은 CSS snippet으로 같은 표시를 제공하는 안이다. 기존 캡션은 저장된 원본 정보로만 전환한다. 캡션 문법·스타일·기존 내용은 아직 변경하지 않았다.


## 2026-10-16 외부 commit 후 Obsidian Git 패널 갱신

Obsidian Git의 refreshSourceControl=true·refreshSourceControlTimer=7000은 주기적 polling이 아닌 vault 파일 변경 후 debounce다. 외부 터미널 commit/push의 .git 변경만으로 기존 Source Control 목록이 갱신되지 않을 수 있다. 강조 정리 후 실제 Git은 clean이고 로컬/GitHub HEAD가5aa8705로 같았지만 패널에는 이전80개 목록이 남았다. 패널 Refresh로 변경0개·staged0개를 확인했다. 이번 건은 Git index 상태 캐시 문제나 push 누락이 아니며 파일/설정을 변경하지 않았다.

작성 vault를 외부 Git 명령으로 commit/push한 작업의 완료 기준에 Obsidian Git Refresh와 실제 변경 수 확인을 포함한다. 기존 사용자 미커밋 변경은 남기고 정확한 상태를 보고한다. stale Working Tree diff 탭과 실제 Git 변경 목록을 구분한다. 새 watcher나 polling 설정·서비스는 추가하지 않는다.

## 2026-10-16 명시적 멀티미디어 캡션

캡션은 `> [!caption]` callout으로 작성한다. 바로 앞 이미지·Mermaid·영상·오디오·PDF·외부 임베드·북마크와 figure/figcaption으로 연결하고, 앞에 멀티미디어가 없으면 오류 없이 독립 캡션으로 표시한다. alt와 다음 문단 일치에 의한 추정을 제거했다. 웹과 blog vault의 notion-import snippet에서13px·italic·테마 회색·미디어 아래4px·일반 후속 본문과12px를 적용한다. 제목의 별도 여백은 유지한다.

원본 캡션 metadata와 현재 미디어를 대조해103글286캡션을 전환했다. 이미지223개와 이전 변환에서 빠졌던 bookmark42·video2·code19개의 캡션을 보존/복원했다. code19개 중 Mermaid5개는 그림과 연결하고 일반 코드14개는 독립 캡션이다. 원본 이미지가 Mermaid로 바뀐 글도 현재 캡션 내용과 인접 그림을 대조했다. 별도 자전거 초안1개의 기존 캡션도 전환했으며 draft:true를 유지했다. 전체104문서287캡션이다. 변경 문서의 본문·목록 구조·코드/Mermaid 원문 보존 대조와 관련5개 테스트를 통과했다. 안내·템플릿·CONTENT_CONTRACT와 개인 TODO를 갱신했다. 새 영구 변환기나 의존성을 추가하지 않았다.

소스e3c1770·콘텐츠ec1b769·개인 TODO66c4aff를 게시했다. [Actions38828348844](https://github.com/anyflow/anyflow-blog/actions/runs/38828348844)가1분14초에 성공했고 배포 선언92d29a3의 정적 rollout을 완료했다. 미리보기396글·868참조 자산·미해결0, 공개 캡션272개 연결/일반 코드14개 독립 표시를 확인했다. 운영 AI 플랫폼의 Mermaid 캡션3개·13px/italic, 폴스타4 영상 캡션과 Karma Police 북마크 캡션을 확인했다. 실제 Obsidian 읽기 보기에서 사진·Mermaid의13px/italic·4px 간격과 일반 후속 문단12px를 확인하고 원래 보기로 복귀했다. 작성 vault Git clean·Source Control 변경0개를 확인했다. 댓글 API·배포 도구 이미지는 유지했고 전체 기능 회귀·전수 시각 검증은 반복하지 않았다.


2026-10-16 캡션 뒤 일반 본문 간격을 웹·Obsidian에서8px로 축소했다. 이미지와 캡션 사이4px는 유지한다. 소스d73e70f·콘텐츠5273418·TODO e3e43bc를 게시했고 Actions38829943671(1분19초) 성공·배포 선언39b114a의 정적 rollout을 완료했다. 미리보기·실제 Obsidian·운영 Twelve Factor2에서 본문8px/미디어4px를 확인했다. Obsidian Git 패널 변경0개이며 CSS 간격 변경만 확인하고 전체 회귀 테스트나 미리보기 전체 재빌드는 하지 않았다.


2026-10-16 사용자 정정 기준: 캡션 가운데 정렬·뒤 일반 본문 간격20px·미디어 아래4px. 웹 CSS와 Obsidian snippet·안내·TODO를 일치시켰다. 소스21b596a·콘텐츠3ad0b6b·TODO2a91af1을 게시했고 Actions38830433524(1분41초) 성공·배포 선언1dd0bb7의 정적 rollout을 완료했다. 미리보기와 운영 Twelve Factor2에서 center/20px/4px를 측정했으며 Obsidian에서 center·margin4px 0 20px 적용을 확인했다. Git 패널 변경0개이며 CSS 변경 부분만 확인하고 전체 회귀·미리보기 전체 재빌드는 반복하지 않았다.


2026-10-16 캡션을 왼쪽 정렬로 변경했다. 본문 간격20px·미디어 간격4px는 유지한다. 웹·Obsidian snippet·안내·TODO를 일치시키고 소스6f074bb·콘텐츠7982e2e·TODO9ada161을 게시했다. Actions38831238865(1분26초) 성공·배포 선언58447ec의 정적 rollout과 운영 Twelve Factor2의 left/20px를 확인했다. Obsidian에서 left·margin4px 0 20px, Git 패널 변경0개를 확인했다. 정렬 변경만 확인했으며 전체 회귀나 미리보기 전체 재빌드는 반복하지 않았다.


## 2026-10-16 태그 검색 대소문자 통일

화면의 태그·필터 이름과 작성 Markdown은 유지하고 base.njk의 Pagefind tag 값과 search.js의 요청 tag 값만 소문자로 통일한다. 과거 Notion 표시 태그 Istio4개와 istio22개가 같은 검색 결과26개로 연결된다. 검색 관련2개 테스트를 통과했으며 홈 Markdown 전환에 맞게 기존 검색 시험의 home.sections fixture를 갱신했다. 미리보기396글의 검색 색인을 생성하고 두 태그의26개 결과와 표시 이름 보존을 확인했다.

소스85caf49·TODO1716e4f를 게시했다. Actions38840293259(1분37초) 성공·배포 선언893c779의 정적 rollout 후 운영 OpenAPI endpoint filter의 Istio와 Istio resiliency monitoring의 istio가 각각26개를 반환하는 것을 확인했다. 콘텐츠 저장소·댓글 API·배포 도구 이미지는 변경하지 않았다. 검색 관련 검증만 수행했고 전체 콘텐츠·기능 전수 검증은 반복하지 않았다.


## 2026-10-16 웹 태그 하이픈 표시·검색 통일

작성 vault의 태그는 유지하고 웹 버튼·접근성 이름·선택 필터에서 하이픈을 공백으로 표시한다. 색상 계산·내부 data-search-tag에는 원본 값을 유지한다. Pagefind 색인과 검색 요청은 하이픈·연속 공백을 한 칸 공백으로 바꾸고 양끝 공백 제거·소문자로 통일한다. 카테고리 표시는 유지한다. base.njk/tags.njk/search.js의 공통 경로를 수정하고 관련 검색2개 시험을 통과했다. 미리보기에서 service-mesh12글과 Service Mesh1글이 모두13개로 검색되고 표시에서 하이픈이 제거되는 것을 확인했다. 기존 Istio26개도 유지한다.

소스b181590·TODOa231063을 게시했다. Actions38841278585(1분11초) 성공·배포 선언1f210f0의 정적 rollout 후 운영 ICA 글의 service mesh와 Istio 설치 글의 Service Mesh가 각각13개를 반환하고 필터에도 공백으로 표시되는 것을 확인했다. 미리보기 검색 색인은396글이며 콘텐츠 저장소·댓글 API·배포 도구 이미지는 변경하지 않았다. 검색·표시 관련 검증만 수행하고 전체 콘텐츠·기능 전수 검증은 반복하지 않았다.


## 2026-10-16 홈 연락처 아이콘·원본 링크 회색

작성 원본 blog.md의 Linkedin/Github/Youtube/Strava 앞에 로컬 SVG를 추가하고 이메일 코드 앞에 봉투를 추가했다. Font Awesome Free6.7.2(CC BY4.0)의 원본 attribution comment와 _assets/social/NOTICE.txt를 보관하고16x16·색상 변경을 표시했다. LinkedIn #0a66c2, YouTube #ff0000, Strava #fc4c02, GitHub #787774, 이메일 #eb5757을 사용한다. 링크·표시 문구·이메일 난독화는 유지하고 .profile-links img의 인라인 배치만 추가했다. 실제 Obsidian 읽기 보기의5개 이미지 로드/16x16과 Git 패널 변경0개를 확인하고 원래 문서·보기로 복귀했다.

사용자 원본 https://anyflower.notion.site/k8s-workload-1-2-2cae57e23bcd80d6b445d6f3d70f1d03 의 실제 Notion 링크 span은 color:inherit·opacity:0.7이다. 실제 라이트 DOM foreground#2c2c2b, 원본 CSS .notion-dark-theme의 --c-texPri=#f0efed를 확인했다. 웹 본문·프로필 링크를 각각 rgba(44,44,43,.7)/rgba(240,239,237,.7)로 맞추고 hover의 푸른색을 제거했다. 밑줄 원본 --ca-opaLinDecCol의 light rgba(55,53,47,.4)/dark rgba(255,255,255,.282)에 opacity.7을 합성해 .28/.1974를 적용한다. 본문 기본 글자색·아이콘 색상·태그·카드 색상은 유지한다.

콘텐츠9ec902c·e2abd77, 아이콘 CSS9aaaaf7과 링크 CSS931e961을 게시했다. 최종 Actions38895019405(1분23초) 성공·배포 선언a4517d3의 정적 rollout을 완료했다. 미리보기396글·872참조 자산·미해결0, 운영 홈5아이콘16x16/정상 로드와 프로필 링크의 라이트 rgba(44,44,43,.7), 운영 k8s1 글의 light/dark 링크 rgba값을 확인했다. 테마 확인 후 라이트로 복귀했다. 댓글 API·배포 도구 이미지는 변경하지 않았고 해당 표시만 확인하며 전체 콘텐츠·기능 전수 검증은 반복하지 않았다.


## 2026-10-16 원본 링크 카드 레이아웃

원본 Notion 일반 카드의 로딩 완료 상태(17px/500 제목·좌측154px 이미지·제목 위 사이트 아이콘)와 YouTube 기본 북마크(14px/400·우측 이미지)를 구분한다. 초기 로딩의14px 카드만을 원본으로 판단하지 않는다. lib/bookmark.js의 공통 원본 bookmark/cardlink 렌더링 경로를 수정하고 전체 URL·escaped metadata·기존 링크·이미지를 유지한다. YouTube는 썸네일 여부가 아닌 정상 제공 사이트 hostname으로 분류해 재생목록도 기본 형식을 사용한다. favicon은 단일 DOM 노드를 배치하고 대표 이미지 후보에서 계속 제외한다.

일반 데스크톱 카드는17/22px·500 제목,13/18px 본문색 설명·보조색 URL,18px24px14px 여백,10px 모서리와 원본 테두리/hover를 사용한다. 전체 높이는 고정하지 않고 내용과154px 이미지 영역으로 결정한다. YouTube와 사이트의600px 모바일 기준은24px 제목 영역·32px 설명 영역·16px URL/아이콘을 사용해 자연 높이108px가 된다. 좁으면 이미지를 숨긴다. 홈 소개 카드는 별도 구성으로 유지하며 연락처 목록과 같은97px다. 명시적 카드 캡션4px도 유지한다. 실제 모바일 기기가 아닌390px viewport로 확인했다.

관련7개 테스트로 provider/playlist 구분·전체 URL escaping·위험 protocol·원본 metadata·cardlink/local asset·대표 이미지 추출·캡션 연결을 확인했다. 미리보기 일반 이미지 카드156px, 무이미지/설명 유무 카드129.296875/121/108.296875px, YouTube108px가 원본 측정값과 일치한다. 다크 설명#f0efed·URL#ada9a3·테두리#383836, 모바일108px/14px제목/16px아이콘/이미지숨김, 홈97px, 캡션4px를 확인했다. 전체 콘텐츠·기능 전수 검증은 반복하지 않았다.

소스c6dea4f·21f3069·TODO295fadd를 게시했다. Actions38899977133(1분23초) 성공·배포 선언b387e0a의 정적 rollout 후 운영 OpenTelemetry·k8s2·Blade Runner·홈에서 위 제목/좌측이미지/자연높이/전체URL/홈높이를 확인했다. 운영 다크 설명·URL·테두리도 확인하고 라이트로 복귀했다. 콘텐츠 저장소·댓글 API·배포 도구 이미지는 변경하지 않았다. 미리보기는 필요한 Eleventy 렌더와 검색 색인만 갱신했으며 전체 미디어 재생성은 하지 않았다.


## 2026-10-16 공통 Notion 스타일 운영 반영 완료

사용자 운영 배포 요청으로 소스98a9088·콘텐츠e2abd77을 게시 Actions38902745201로 배포했다. https://github.com/anyflow/anyflow-blog/actions/runs/38902745201 은1분15초에 성공했고 배포 선언1eca8ae의 정적 이미지 sha256:ecc05abe5e647e30dc4dfcb7fbe5cb349dc6403c7c33da5d7d219d7731e26de0 을1분 주기 Kubernetes 배포 작업이 적용했다. Deployment rollout 성공과 신규 Pod Ready1/1·재시작0을 확인했다.

운영 www.anyflow.net 홈의 본문rgb(44,44,43)·Recent15px·By Category14px·제목top308px, OpenTelemetry의 투명 접기/펼침·콜아웃#f9f8f7/10px·코드36px22px/YAML key#07a, k8s1의 표14px/20px·제목top308px를 브라우저에서 확인했다. 댓글 API·배포 도구 이미지는 교체하지 않았다. 관련 대표 표시만 확인했고 콘텐츠·기능 전수 검증은 반복하지 않았다.


## 2026-10-16 Notion 블로그 원본 삭제 전 검증·복원 완료

사용자의 원본 삭제 전 요청으로 현재 Notion 블로그 루트와 하위 Blog DB를 하위 페이지·모든 콘텐츠·댓글 포함 HTML로 내보내어 검증했다. 원본 ZIP449361197bytes/1044entries/CRC오류0, 공개396글·초안1·홈1 전부 대응, HTML첨부3 별도, MP3/PPTX/PDF/HEIC10개 원본 SHA일치, vault raster1098/SVG6 오류0을 확인했다. 운영 정적1788파일 SHA·이미지874·내부참조14939건, 댓글233건/답글119관계/과거198ID/원본이미지50개와 운영66대상 GET 일치를 확인했다. 이는 사용자 명시 요청의 삭제 전 데이터 전수검증이며 기능별 반복 회귀검사를 추가하지 않는다.

네 글의 누락 참고 링크5개와 AI engineering의 미닫힘 강조1개를 복원해 콘텐츠f63e152로 commit·push했다. 링크는 Istio issues51434/17118, VictoriaMetrics issue4038, semantic-release와 opentelemetry-operator 저장소의 정확한 원본 주소다. 미리보기와 운영 변경5글 HTTP200·링크5/5·강조1/1을 확인했다. 게시 Actions38918027975 첫 실행의 한글 폰트61.2MB 다운로드가 지연되어 취소하고 같은 작업을 새GitHub runner에서 재시도했다. 두 번째 실행1분16초 성공·선언55e0728·정적 sha256:0a671ef351a1c12159b8cab385122b48c01263769662af6a8885459de31b704c rollout과 신규 PodReady1/1·재시작0을 확인했다. 댓글 API·배포 도구 이미지는 유지했다.

최종 게시본의 비설정 추적1525파일 중 변경5개만 다르고 나머지1520개가 전수검사 기준과 동일하다. Mac /Users/anyflow/Documents/Codex/2026-10-12/any/outputs/Notion 삭제 전 검증/에 상세 보고서·원본ZIP·게시본archive·댓글전체Gitbundle을 보관한다. 서버의 영속 백업은 /home/anyflow/backups/anyflow-blog/notion-20261016/이다. 원본ZIP·댓글bundle과 게시본blog-content-published-f63e152.tar.gz의 양쪽 SHA일치를 확인했으며 게시본SHA는 a5f55a9d3b691a139953eb365c3651a587bbc4549c34d68fa1dceec153d17131 이다.

판정: 검증한 Notion 블로그 루트와 하위 Blog DB는 독립 백업을 유지하며 삭제해도 데이터 보존에 문제가 없는 수준이다. Notion 실제 삭제, 다른 개인 페이지와 계정 전체 삭제, 버전이력·권한 복제, 실제 Notion재가져오기 복구시험은 수행하지 않았다. 최초 전수검증 후에는 복원 범위만 재검사했다.


## 2026-10-17 링크 표현·본문 카드 운영 반영

소스57af669·콘텐츠f0e9e55를 Actions38924165724로 운영에 게시했다. https://github.com/anyflow/anyflow-blog/actions/runs/38924165724 는1분21초에 성공했다. 배포 선언810cd33의 정적 이미지 sha256:eea14871822bc3b30cc408998f7a49397a951cac3e711b1bded19492f1d5a229 를1분 주기 CronJob이 적용했고 Deployment rollout 성공·새Pod Ready1/1·재시작0을 확인했다.

운영 OpenTelemetry overview의 본문 북마크15개100px·GitHub 미리보기3개57px, OpenAPI endpoint filter의 GitHub 카드57px·링크 멘션10개·이슈2개 Closed 배지와 아이콘 표시를 확인했다. 댓글 API·배포 도구 이미지는 유지했다. 전체 콘텐츠·기능 회귀를 반복하지 않고 변경된 대표 표시만 검사했다. Obsidian 붙여넣기 메뉴·읽기 보기 검증은 직전 로컬 작업에서 완료했다.


## 2026-10-17 파일 구조·댓글 post_id 전환 완료

작성 vault와 anyflow/blog를 `<분류>/<slug>.md`, 전용 첨부를 `_assets/<분류>/<slug>/`, 공용 자산을 `_assets/_covers`·`_icons`·`_social`, 메타데이터를 `_assets/_meta`로 전환했다. 글·홈·안내·템플릿400개 MD의 permalink/post_id 속성을 제거했다. 공개396글 URL은 유지하고 댓글 글 ID는 공개 경로, 홈은 /다. 초안1개는 발행하지 않았다. 작성 템플릿·안내·선택기·본문 링크·임베드·아이콘/커버·카탈로그·검색·OG·sitemap을 같은 경로 기준으로 연결했다.

콘텐츠33403bc를 게시했고 작성 환경 설정만 바꾼 후속bc620c9도 push했다. 두 revision 사이 공개 입력 변경은 없고 .obsidian3파일만 다르다. Blog 링크1.1.1은 첨부 위치를 노트별로 메모리에서 설정하며 매 노트 전환 때 app.json을 쓰지 않는다. 실제 Obsidian의 평탄한 파일 열기·읽기 보기·첨부 경로와 오류0을 확인했다. 원격/로컬 Git의 동일 객체를 SHA검증해 Mac Git 객체 읽기 지연을 우회하고 동일 commit을 홈 서버에서 push했다. 별도 콘텐츠 압축 백업은 만들지 않았다.

소스98e0ff7/Actions38964692820(1분35초)로 최초 이미지, 재시도 수신의 원래 comment_id를 유지하는f3d6429/Actions38965394110으로 API 보완 이미지, 기존 공개 첨부 주소872개를 symlink로 유지하는8526cb5/Actions38966028484로 최종 정적 이미지를 게시했다. 운영 정적 sha256:a01f2d5b795af4ce09f66cc2459f0e973da1a36d28e55bb289d50b1b518144d5, API sha256:d71bc79513032503af825cd7883fb0aaeb74cbab68f0aa9798a987a5f52d3fb6의 rollout·Ready1/1을 확인했다. 배포 도구 이미지는 유지했다. 후속 소스는 writer 설정·롤백 도구·문서 변경이다.

댓글 main c1ff03f와 incoming4브랜치, PVC 큐의 글 ID·글 Like 대상·접수/순서 기록을 전환했다. 각 브랜치의 댓글·답글·소유권·시각·Like는 왕복 변환으로 동일함을 확인했다. 운영66글 API를 전환 전 모델과 대조해 공개225·삭제6 레코드와 Like가 일치했고 실패0이다. 승인 대기2건은 비공개로 유지했다. 큐 jobs0·완료 접수4·순서3개를 보존했다. 쓰기 차단 시험은503이며 접수하지 않았다. 명령 기록 기준 KST05:50:45에 API전환을 시작했고06:00:08에 쓰기를 재개했다. 실제 HTTP장애 시작/종료 시각을 별도로 계측한 기록은 아니다.

공개396글의 URL·본문 링크/미디어 참조 순서·코드 내용을 대조했다. 첨부 SHA보존·참조 누락0, 기존/새 webp·SVG·HTML·MP3·PDF URL 모두200을 확인했다. 작은 이미지의 운영SHA도 일치한다. 기존 공개 자산872개는 중복 바이트 없이 새 파일로 연결되며 실제 nginx 컨테이너의 symlink872개를 확인했다. 소스 변경 관련 콘텐츠/홈/OG/sitemap39개·기존 댓글API/Git/큐33개·이관/롤백 도구/붙여넣기/자산 호환 테스트를 통과했다. 전체 화면 회귀·모든 기능 전수 검증은 반복하지 않았다.

롤백은 각 저장소의 path-layout-20261017-before와 댓글 main/incoming의 cutover 태그, 콘텐츠 `_assets/_meta/path-migration.json`, 댓글 `migrations/path-layout-20261017.json`의 양방향 대응표를 사용한다. 최신 댓글·Like와 새 글·미디어를 역변환하는 도구를 시험했고 작성 플러그인·관리 경로 복원도 포함한다. PATH_LAYOUT_ROLLBACK.md와 operations/path-layout-maintenance-job.json을 따른다. 실제 운영 rollback은 실행하지 않았다. 임시 유지보수Job·검증용worktree·큐 원본 비교 사본은 정리했고 실제 PVC·Secret·Git태그는 유지했다. CronJob과 댓글 게시 Actions는 재개했다.
