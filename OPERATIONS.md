# OPERATIONS

## 현재 단계

최신 운영 배포는 `profile-20261013-5371f9a`다. 정적 결과는 코드 `6699059`·콘텐츠 `5371f9a`이며 문단 복원·Pagefind 검색·태그 필터·누락 글 3편과 원본 Share 동작을 포함한다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 코드 저장소는 비공개 git@github.com:anyflow/anyflow-blog.git이다.

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

검증한 서버 정적 출력을 캐시 nginx 런타임에 패키징해 kind 두 노드에 적재하고 기존 Deployment를 삭제 없이 rollout했다. 표준 다단계 Dockerfile 전체 재빌드와 GHCR 업로드는 수행하지 않았다. 이전 font 이미지와 Deployment 이력을 유지한다. 상시 미리보기도 397편으로 갱신했다. 증거는 Mac의 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 운영 배포/` 및 서버 `.cache/release-20261013-5371f9a/`에 보관한다. 자동 게시·RSS·sitemap·추가 OG 보완은 후속 작업이다.

## 2026-10-13 Share 동작 보정

원본의 공개 공유 코드를 확인해 Web Share 지원 시 OS 공유창을 사용하고, 미지원·권한 오류 시 링크 복사·Facebook·X·LinkedIn·Pinterest 메뉴를 표시한다. 취소는 추가 동작 없이 끝낸다. 공유 아이콘은 로컬 자산이며 URL을 매개변수로 인코딩하고 메뉴는 Esc·바깥 클릭으로 닫힌다. 테스트 24/24와 전체 397편 미리보기 빌드, Web Share 미지원 상태를 재현한 격리 브라우저의 PC·모바일·다크·키보드 조작을 검증했다. SNS 실제 게시·전송은 수행하지 않았다.

배포 태그는 `share-20261013-5371f9a`이며 콘텐츠 `5371f9a`를 유지한다. 이전 publish 런타임에 검증한 정적 결과를 패키징하는 방식을 사용한다. 검수와 배포 증거는 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog Share/` 및 서버 `.cache/share-review/`에 보관한다.

운영 검증: 코드 `c3517f63051c5aa5b70be353c9e5e47ebc2f7b71`, 이미지 ID `sha256:df6df31a4c48bd0904c3c2a111ecca1341c280e3fe19a883f04483bf0297a2ae`, Pod `anyflow-blog-cc6c6757c-98fsp` Ready 1/1·재시작 0이다. 이미지·실행 Pod의 정적 파일 2,043개 해시가 일치하고 공개 홈·대표 글·CSS·공유 JS·메인 JS·아이콘 4개의 실제 응답 9개가 200이며 바이트 해시도 일치한다. 공개 HTML에 격리 검수용 API override는 없다. Gateway·HTTPRoute spec과 기존 anyflow.net은 유지한다.

## 2026-10-13 홈 소개 링크 높이

코드 `66990592fcadf0477dcef8d13f69695591a4e831`에서 bookmark의 `height:74px`·`align-self:flex-start`를 `height:auto`·`align-self:stretch`로 바꿨다. 운영 PC와 미리보기 PC·태블릿의 목록·카드가 모두 97px이며 모바일 390px의 세로 카드 228px·이미지 154px과 라이트·다크를 유지한다. 서버 테스트 24/24와 397편 빌드를 통과했다.

이미지는 `ghcr.io/anyflow/anyflow-blog:profile-20261013-5371f9a`, ID는 `sha256:d3b41be0c7fc77713e957de8785f2f2e083e8c0e60770e57d1a35f37c6b2713b`다. Pod `anyflow-blog-54686f7cb7-svst5` Ready 1/1·재시작 0, 정적 파일 2,043개 일치와 Gateway·HTTPRoute spec 유지를 확인했다. 기존 캐시 nginx 패키징·kind 적재 방식과 콘텐츠 `5371f9a`를 유지한다. 검수 자료는 `/Users/anyflow/Documents/Codex/2026-10-12/any/outputs/blog 소개 높이/`에 보관한다.
