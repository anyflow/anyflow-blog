# AGENTS.md

이 문서는 `apps/anyflow-blog` nested repo에 적용한다. 상위 my-cluster의 AGENTS.md를 함께 따른다.

## 작업 원본

- 소스의 기준은 alpine의 `/home/anyflow/workspace/my-cluster/apps/anyflow-blog`다.
- 수정·빌드·검증은 원격 소스에서 수행한다.
- 2026-10-13 문단 복원은 사용자 요청에 따라 Mac의 `/Users/anyflow/workspace/anyflow-blog`에서 수정·빌드·검증한다. 서버 접속 복구 후 원격 작업트리와 대조해 반영했다. 문단 복원 코드·콘텐츠를 GitHub에 게시했고 이번 publish 배포에 포함했다.
- 같은 로컬 소스에서 사용자 요청의 검색 기능 정리를 구현·검증한다. 문단 복원은 코드 `c792373`·콘텐츠 `7fc3314`를 GitHub에 게시했다. 검색 변경을 GitHub에 게시했고 이번 publish 배포에서 공개 검색과 태그 필터를 검증했다.
- 작성 템플릿·누락 콘텐츠 정리도 같은 로컬 소스와 iCloud blog vault에서 수행한다. 코드·콘텐츠를 GitHub에 게시했고 사용자 배포 요청으로 `publish-20261013-5371f9a`를 운영에 반영했다. 정적 결과의 코드·콘텐츠는 `58dbc1f`·`5371f9a`다.
- anyflow-blog는 my-cluster 안의 별도 Git 저장소다. 코드의 Git 이력을 이 저장소에서 관리한다.
- 콘텐츠는 비공개 `git@github.com:anyflow/blog.git`의 루트를 `.cache/blog/`에 동기화한다.
- iCloud의 독립 blog vault가 작성 원본이며 개인 obsidian-vault의 BLOG는 복구용 보관본이다.

## 현재 단계

- 메타데이터 후속 작업은 글별 OG 제목·설명·대표 이미지·공개 주소 제공으로 한정한다. RSS·sitemap 추가 구현은 범위에서 제외한다.
- UUID 별도 주소·redirect 구현은 범위에서 제외한다. UUID 주소로 발행된 글은 모든 기능 구현 후 최종 전수 검증 직전에 일반 permalink로 일괄 변경한다. 내부 링크·댓글 주소 대응과 OG 메타데이터를 함께 갱신하며 원본 UUID는 내부 식별 대응에만 사용한다.
- 대표 화면은 홈, Istio 설치 글, 프라이베르크·포츠담 여행기다.
- 대표 UI 12쌍 비교, 코드 commit·push와 blog.anyflow.net 배포를 완료했다.
- 이번 배포 대상은 blog.anyflow.net만이다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 콘텐츠는 anyflow/blog의 2d06f6c를 깨끗한 작업 사본에 동기화했다.
- 전체 글의 빌드 통과와 전체 콘텐츠의 시각 검수, 사용자 UI 승인을 구분한다.
- 카드 갤러리 구현 당시 미리보기에서 공개 글 397개와 참조 첨부 926개를 생성했다. 운영 profile 이미지는 이전 첨부 구성을 유지한다. Notion 변환 글 396개와 기존 Markdown 보존 글 1개를 구분한다. 원본 블록 전체 대조, 이미지 645개 디코딩과 기존 미해결 참조 정리를 완료했다. 원본에서 목적 블록을 찾지 못한 8종 링크는 해당 글로 연결한다.
- 직전 배포 태그는 profile-20261013-5371f9a이며 본문 글꼴의 가장자리 처리는 원본과 같은 auto다. 실제 코드·콘텐츠 revision과 런타임 증거는 OPERATIONS.md에 기록한다. profile 배포 당시 홈 서버 회귀 테스트는 24/24이며 실행 Pod의 정적 파일 2,043개와 빌드 결과를 대조했다. 최신 배포 revision과 실제 검증은 OPERATIONS.md에 기록한다.
- 서버 재부팅 후 기존 루트 make port_forward가 필요할 수 있다. 호스트 DNS·기본 라우트는 변경하지 않았다.

## 4단계 표시·작성 개선 — 운영 반영

- Mermaid 축소의 원인은 전역 SVG 아이콘 스타일이었다. `src/css/style.css`에서 아이콘에만 적용하며 공개 글 9개·Mermaid 13개를 PC·모바일·라이트·다크와 테마 전환에서 검증했다.
- 홈·글의 커버 위치는 항상 중앙(50% 50%)이다. 작성 vault의 cover_x·cover_y·cover_position을 제거하며 웹은 이전 좌표도 무시한다. 커버 선택 후 위치 조절 창은 자동으로 열지 않는다.
- `src/js/image-viewer.js`가 본문 사진과 Mermaid의 확대 팝업을 제공한다. 원본 이미지·SVG를 사용하며 그림·배경·닫기 버튼 클릭과 Esc로 닫고 원래 그림으로 포커스를 복원한다. Mermaid SVG는 팝업을 닫으면 같은 노드를 본문에 되돌려 ID·테마·배치를 유지한다. 링크가 있는 이미지와 참조·알림 상자 아이콘은 제외한다.
- 카드 선택은 `thumbnail`을 사용하며 사진 링크 또는 현재 글의 Mermaid 블록 참조를 저장한다. 없으면 본문의 첫 사진·Mermaid·YouTube·X 이미지, 모두 없으면 텍스트다. 이전 export의 `hero_image`는 선택값에서 제외한다. 숨겨진 카드의 Mermaid는 Load more 뒤에 렌더링한다.
- `lib/youtube.js`와 `lib/x.js`가 소셜 iframe 이미지를 추출하며 Obsidian 갤러리도 같은 함수를 사용한다. 선택기 0.3.0에서 YouTube·X 선택값은 공개 이미지 URL이다. X는 Notion iframe으로 감싼 주소도 읽으며 게시물의 첨부 사진·동영상 포스터를 사용한다. 빌드 시 `lib/x-cache.js`가 `.cache/x-thumbnails.json`에 조회 결과를 보관한다. 조회 실패 시 다음 그림으로 넘어가며 텍스트만 있는 X의 이미지 생성은 하지 않는다.
- `base.njk`가 글별 OG 제목·설명·대표 이미지·절대 URL을 제공한다. 대표 이미지는 카드 사진·YouTube·X, 글 커버, 홈 커버 순이며 Mermaid는 커버를 사용한다. `site.url`은 현재 대상인 `https://blog.anyflow.net`이다.
- Obsidian 선택기 원본은 `integrations/obsidian-card-image/`다. blog vault에 Blog 카드 이미지 플러그인으로 설치·활성화했다. `npm test`의 pretest가 picker.js·diagrams.js와 기존 Markdown-it 14.1.1을 설치용 main.js로 패키징한다.
- 카드 갤러리 최초 구현 시 회귀 테스트 35/35를 확인했다. 이번 OG·YouTube 보완은 관련 테스트 4개와 폴스타4의 홈 카드·OG·Obsidian 갤러리만 확인했다. `_preview`를 갱신했으며 현재 Mac 미리보기는 `http://127.0.0.1:8765/`다. Git 게시 후 2026-10-14 사용자 요청으로 release-20261014-6dab388 운영 배포에 포함했다.

## 5·6단계 방문 통계·댓글 — 운영 반영, 신규 댓글 게시 검증 대기

- 기존 GA4 계정 `100207646`·속성 `333773406`·웹 스트림 `4090770035`의 측정 ID `G-YWPHXJFYET`를 확인했다. `src/js/analytics.js`는 `anyflow.net`·`www.anyflow.net`에서만 로드하며 localhost·`blog.anyflow.net`은 측정하지 않는다. 기존 gtag·GTM·UA와 중복 초기화를 막는다. 2026-10-15 기존 GA4 속성333773406의 실시간 page_view → page_location에서 운영 검증 URL https://anyflow.net/blog-construction/prepare?ga_verify=20261015-check-1과 이벤트1건 수신을 확인했다. 운영 페이지 측정 ID는 G-YWPHXJFYET이며 태그 설정·시험 이벤트를 추가하지 않았다. UA 통계 백업 확인은 사용자 요청으로 범위에서 제외했다.
- `lib/comments/`·`scripts/comments-server.js`·`src/js/comments.js`가 수신 API·Git 저장·Disqus와 유사한 UI를 제공한다. 방문자 쿠키는 1년, 관리자 쿠키는 7일이며 HTTPS에서 HttpOnly·Secure·SameSite=Lax를 적용한다. 공개 JSON에서 작성 권한 검증값·대기 댓글을 제외한다. Git 충돌 재시도와 재시작 후 PID 잠금 복구를 처리한다.
- 댓글 데이터는 비공개 `anyflow/blog-comments`에 보관한다. 신규 댓글·답글의 incoming 브랜치로 Actions가 PR을 만들고 승인 OFF는 자동 merge, ON은 관리자 승인 후 공개한다. Like·공개 댓글의 직접 수정·삭제는 main에 기록한다. 이 댓글 전용 Actions는 보류 중인 3단계의 블로그 전체 자동 배포와 별개다.
- 과거 댓글 198개(Disqus 79·이미지 119, 공개 196·삭제 2, 답글 102)를 62개 글과 홈에 이관했다. Like 95개 대상의 댓글 24·글과 홈 27을 보존했으며 0명시 대상은 62개다. 원본 XML·OCR·텍스트와 이미지 46개를 댓글 저장소에 비공개 보관한다. 확인한 백업 44블록은 작성 vault 본문에서 제거하고 원본 자산은 유지했다. Cassandra 글의 잘린 날짜가 있는 1블록은 확인 대상으로 남긴다.
- 데이터 저장소 `73c64351c9fe479ff05f2fd2c0fe061b566a91e6`의 [게시 Actions](https://github.com/anyflow/blog-comments/actions/runs/38418854320)가 성공했다. 실제 새 댓글의 PR 생성·승인 OFF/ON·메일 수신은 운영 연결 후 확인한다.
- OpenRC 미리보기는 Node 댓글 API 서버와 운영 Git에서 분리한 preview Git을 사용한다. 미리보기에는 과거 댓글·Like를 넣었으며 `http://127.0.0.1:8765/`에서 확인한다. 글 고정 `id`와 공개 `comments/catalog.json`을 사용하며 API는 운영 카탈로그 URL을 5초 캐시로 갱신할 수 있다.
- `Dockerfile`의 `comments-api` target·`deployment/deployments.yaml`·`deployment/services.yaml`은 준비 단계다. API 이미지를 release-20261014-6dab388로 빌드해 kind 두 노드에 적재하고 Secret·Service·Deployment를 운영에 연결했다. 정규 다단계 빌드는 npm ci에서 중단되어, 공식 Node 런타임·Git·SSH·소스와 검증한 카탈로그로 패키징했다. 운영 API Service 없이도 정적 nginx가 시작하도록 공식 entrypoint의 DNS resolver 템플릿을 사용하고 `nginx -t` 1회 통과했다. SSH 전용 키·관리자 설정은 비추적 `.cache/comments-runtime/`와 Kubernetes Secret에만 보관한다. 키·토큰 값을 문서·이미지·Git에 넣지 않는다.
- 2026-10-14 사용자 요청으로 blog.anyflow.net 운영 배포까지 승인·진행했다. 3단계 자동 배포와 anyflow.net 도메인 전환은 보류한다. 최종 UUID 주소 정리와 전수 검증은 전체 구현 TODO 완료 후 수행한다.

## 핵심 구현

- `.eleventy.js`: 공개 글 데이터를 Eleventy에 연결하며 Nunjucks 템플릿만 생성 입력으로 사용한다.
- `lib/content.js`: 공개 대상 선별, Markdown·링크·첨부 변환, 목차·날짜·목록 데이터 생성
- `lib/search-index.js`, `src/js/search.js`: 공개 글 397개의 Pagefind 색인과 공통 검색 팝업·정확한 태그 필터. 로컬 검색 검수와 서버 테스트 21/21을 통과했고 운영에서 본문 검색·태그 필터를 확인했다.
- `scripts/build.js`: 별도 경로에서 빌드한 뒤 `_site` 또는 `_preview`로 전환, 이전 결과 한 개 보관
- `src/index.njk`, `src/post.njk`, `src/_includes/`: 홈과 상세 템플릿
- 콘텐츠 `_assets/visuals/manifest.json`: 원본 398개 페이지의 시각 자산과 Notion 원본 주소 대응. 커버 98개·이모지 이미지 172개를 vault에 보관한다.
- 글 397개와 홈에 `cover`·`cover_x`·`cover_y`·`icon`을 연결했다. Pixel Banner 3.6.18의 갤러리·이모지 선택기에 대응하며 이전 CSS 좌표도 읽는다. slug가 없는 글 8개도 원본 UUID 주소로 수집했다. 최신 글 3개의 속성·본문을 연결했다.
- `src/_data/visuals.json`: 대표 태그 표현과 속성이 없는 콘텐츠의 참고값. 작성자 속성을 우선한다.
- `src/_includes/icon.njk`: 작은 이모지는 캐시 이미지, 큰 이모지는 문자, 사용자 이미지 아이콘은 크기와 관계없이 파일을 사용한다.
- `src/css/`, `src/js/`: 표면 재현과 다크모드·목차·목록 펼치기·코드 복사
- 다크 팔레트는 사용자가 지정한 Notion 공개 렌더러의 `.notion-dark-theme` 색상 정의를 사용한다. 배경 `#191919`·본문 `#f0efed`·보조 글자 `#ada9a3`와 카드·코드·팝업을 미리보기에서 검증했다. 초기 요청에서는 commit·push까지 진행했고 2026-10-14 운영 배포에 다크 팔레트를 포함했다.
- 홈 소개 bookmark는 고정 높이 없이 옆 연락처 목록에 맞춰 stretch한다. PC·태블릿에서 양쪽 97px, 모바일 카드 228px을 확인했고 코드 `6699059`를 profile 이미지로 배포했다.
- `src/js/share.js`: 원본과 같은 Web Share OS 공유창·대체 메뉴와 링크 복사. 원본 SNS 아이콘 4개를 로컬에 보관하며 취소·권한 오류·URL 인코딩·복사 실패를 포함해 서버 테스트 24/24와 PC·모바일·다크·키보드 검수를 완료했다. 공유 코드 `c3517f6`과 콘텐츠 `5371f9a`를 share 이미지로 운영에 반영하고 새 공개 스크립트·아이콘과 Pod 파일을 검증했다.
- `src/js/vendor/`: Mermaid와 highlight.js 고정 버전 및 라이선스. 실행 시 외부 CDN을 사용하지 않는다.
- `tests/content.test.js`, `tests/import-notion.test.js`, `tests/build.test.js`: 원본 변환·Obsidian 형식·공개 경계·잘못된 입력 차단과 실패 시 결과 보존
- `lib/obsidian-markdown.js`, `lib/validate-content.js`: 알림 상자·캡션·수식·블록 링크와 생성 참조 검증
- `scripts/import-notion.js`, `scripts/audit-import.js`: 공개 원본의 일회성 재변환과 글별 블록 대조. 콘텐츠 `_assets/notion-import.json`은 비공개 검증 manifest다.
- `src/posts/`는 현재 입력이 아니다. 콘텐츠 작업 사본과 생성 결과는 Git 추적 대상에서 제외한다.
- Markdown 원문이나 설정 파일을 public output으로 passthrough하지 않는다.

## 검증 기준

전수 검증은 2026-10-14 사용자 요청으로 1회 수행했으며 반복하지 않는다. 이후 자동 배포·UUID·결함 수정은 변경한 부분의 관련 테스트와 대표 사례만 확인한다. 개인 vault의 NOW/NEW BLOG/blog 이전 TODO.md와 함께 관리한다.

- 기능별로 변경한 로직의 관련 테스트와 대표 사례만 확인한다. 새 복잡한 로직의 작은 테스트와 글 저장 시 데이터 손상 방지 확인을 유지한다.
- PC·모바일·라이트·다크는 해당 변경에 직접 영향을 받는 화면만 확인한다. 수정하지 않은 기능과 이미 통과한 화면을 반복 검사하지 않는다.
- 전체 글·원본 블록·본문 보존 대조, 전체 이미지 디코딩·자산 해시, 전체 공개 URL, 모든 화면 조합 검사는 최종 전수 검증으로 모은다.
- 미리보기 갱신에 필요한 빌드와 생성기의 기본 입력 검증은 유지한다. 매 기능마다 전체 회귀 테스트나 별도 콘텐츠 전수 검사를 실행하지 않는다.
- 미배포 작업에서는 운영 상태를 재확인하지 않는다. 실제 배포 시 상태·변경 파일·대표 동작만 확인한다.
- UI 자동화 도구 복구에 오래 매달리지 않는다. 실패하면 간단한 대체 확인 방법으로 전환한다. 별도 검수 보고서·JSON·스크린샷은 필요할 때만 남기고 기본 결과는 TODO에 기록한다.
- 최종 전수 검증에서 발견한 문제는 수정한 부분만 다시 확인한다. 전체 검증을 반복하지 않는다. anyflow.net 전환은 별도 승인을 받는다.

## 미리보기 빌드

```sh
make sync
BLOG_OUTPUT_DIR=_preview npm run build
```

- 현재 OpenRC `anyflow-blog-preview`가 Node 댓글 API·정적 미리보기를 상시 제공한다. 같은 포트의 npm run dev를 추가 실행하지 않고 수정 후 미리보기 빌드만 수행한다.
- 원격 미리보기는 127.0.0.1:18765에 바인딩한다. Mac의 LaunchAgent `net.anyflow.blog-preview-tunnel`이 127.0.0.1:8765로 연결한다. 양쪽 프로세스의 자동 복구를 검증했다.
- 갤러리 편집 내용의 웹 미리보기 반영은 콘텐츠 사본 동기화·재빌드가 필요하다. 게시 자동화는 아직 구성하지 않았다.
- 콘텐츠 변경 시에만 `make sync`를 수행하고 미리보기 갱신이 필요할 때 빌드한다.
- Git 게시 전에는 변경한 파일만 검토한다. 기능 확인 범위는 위 검증 기준을 따른다.
- 서버의 GitHub DNS 조회가 실패하면 DNS 운영 설정을 임의로 바꾸지 말고 동기화 제약을 구분해 보고한다.

## 운영 구조와 배포

- 현재 기존 배포는 service namespace의 Deployment/Service anyflow-blog다.
- 공개 경로는 Gateway API HTTPRoute와 cert-manager 인증서로 blog.anyflow.net에 연결된다.
- agentgateway는 HTTPS·라우팅을, nginx는 정적 파일 제공을 담당한다.
- Dockerfile은 콘텐츠를 빌드 단계에서 사용하고 정적 산출물만 nginx 이미지로 복사한다.
- 배포 갱신은 전용 checkout에서 make deploy를 사용한다. GHCR digest로 이미지를 받아 삭제 없이 rollout한다. 루트 anyflow-blog-r은 삭제를 포함하므로 일반 갱신에 사용하지 않는다.
- GitHub 제공 runner의 빌드·GHCR 등록·Git 배포 선언 갱신과 Kubernetes CronJob의 1분 pull·Makefile 배포를 사용한다. 자격증명·운영 활성화 상태는 OPERATIONS.md를 따른다. Obsidian 자동 push와 운영 도메인 전환도 후속 단계다.
- 댓글·Like의 수신 API·UI·Git 저장과 과거 데이터 이관을 구현했다. 2026-10-14 운영 연결·이미지 생성·배포를 진행했으며 실제 확인 결과와 제약은 OPERATIONS.md를 따른다.

## 문서

GOAL.md, PLAN.md, ARCHITECTURE.md, CONTENT_CONTRACT.md, OPERATIONS.md를 함께 참조한다. 배포와 사용자 UI 승인은 별도 근거로 기록한다.

## 2026-10-14 운영 배포

현재 정적 사이트와 댓글 API의 태그는 release-20261014-6dab388이다. 정적 코드 6dab388·콘텐츠 2d06f6c를 사용했다. 유선·Wi-Fi의 비대칭 경로와 strict RPF 드롭을 확인하고 Wi-Fi 런타임·부팅 자동 연결을 해제했다. 운영 조회·Like 추가·중복 방지·취소와 게시 Actions를 확인했다. 신규 댓글 PR·승인·메일 수신 검증은 대기하며 API Pod Ready와 기능 완료를 구분한다. 최신 상태·이미지 ID·대표 확인 근거는 OPERATIONS.md에 기록한다. 기존 anyflow.net·DNS·Gateway·HTTPRoute·호스트 DNS·기본 라우트는 변경하지 않았다. 3단계·최종 UUID 정리·전수 검증은 보류한다.

## 2026-10-14 댓글 표시·이미지 복원 미리보기

삭제 행·이전 댓글 태그와 댓글 위 수평선을 숨기고 Like는 0개일 때 🩶 0, 1개 이상일 때 실제 ❤️ 이모지와 숫자로 표시한다. 삭제된 댓글의 답글은 가까운 표시 중인 상위 댓글에 연결하며 작성 중인 답글을 보존한다. 본문 끝에 남은 댓글 백업용 hr도 화면에서 숨긴다. 관련 UI 테스트와 대표 미리보기를 확인했다.

Cassandra 이미지에서 이름·본문을 복원하고 원본에 없는 작성일은 created_at:null·source.precision:unknown으로 보관한다. 검토 완료한 이미지 백업에만 날짜 미상을 허용하며 importer 관련 테스트 3개와 날짜 표시 테스트 1개를 확인했다. 이미지 댓글은 119→120개, 이관 작업 사본은 198→199개이며 preview는 검증 댓글 2개를 포함해 201개다. 원본 198개·기존 Like·설정을 보존했다. 작성 vault와 .cache/blog에서 Cassandra 본문 백업을 제거하고 원본 이미지는 유지했다. 미리보기는 397편·참조 자산 880개를 생성했다.

코드·추가 복원 자료·작성 vault·개인 TODO/spec의 commit·push와 운영 배포는 진행하지 않았다. .cache/blog-comments 작업 사본은 최신 origin/main을 받은 뒤 Cassandra 댓글·검토 자료만 미커밋으로 추가했으며 운영 데이터에 새 댓글을 push하지 않았다. 전수 검증은 실행하지 않았다.

## root 방명록 복원 미리보기

홈 문서의 방명록 이미지 3장에서 24개와 답글 관계 12쌍을 복원했다. 답글 위·아래 위치와 이미지 경계의 원댓글 관계를 대조했고 기존 홈 Disqus의 3단 답글·Like를 유지했다. 잠금 표시 원글·답글 2개는 비공개 대기로 보존해 공개 API·JSON에서 제외하고 관리자에게만 제공한다. 원본 3장·blog.md·검토 자료는 비공개 댓글 작업 사본의 originals/import-20261014-guestbook/에 보존했다.

이관 작업 사본은 223개(Disqus 79·이미지 144), preview는 검증 댓글 2개를 포함해 225개다. 홈은 공개 28개·삭제 2개·비공개 대기 2개이며 UI는 공개 28개를 표시한다. importer의 홈 방명록 목록 수집과 비공개 부모의 답글 보호를 수정하고 관련 테스트 2개와 실제 anonymous API·답글 바로 아래 배치를 확인했다. 작성 vault·.cache/blog에서 root 방명록 백업 섹션을 정리했고 원본 파일은 유지한다. 공개 미리보기의 원본 이미지 URL은 404다.

소스·콘텐츠·추가 복원 자료·문서의 commit·push와 운영 배포는 대기한다. 전수 검증은 실행하지 않았다.

답글은 기본으로 접고 사용자가 펼친 상태는 댓글·Like 갱신에도 유지한다. 답글 작성 시 해당 가지를 펼치며 작성 중인 초안을 보존한다. 댓글 정렬은 최상위 댓글 최신순·각 댓글의 답글 작성순으로 표시한다. 답글의 답글은 해당 답글 바로 아래에 유지하며 작성일 미상 항목은 마지막에 둔다. 정렬 관련 테스트 2개와 미리보기 빌드를 확인했고 commit·push·운영 배포는 대기한다.

## 2026-10-14 댓글 UI 후속 배포

Comments 표제는 본문 첫 제목 크기를 사용하고 같은 행 오른쪽에 14px Like·댓글 수를 배치한다. 답글은 기본 접힘이며 답글 X개와 상태별 꺾쇠를 표시한다. 댓글 입력 후 이름·선택 링크를 입력하고 각 표제는 placeholder와 접근성 이름으로 제공한다. 작성 폼은 외부 박스 없는 무채색 UI다. UI·이관 관련 테스트 21개를 통과했다. 복원 댓글 25개·원본 자료를 비공개 댓글 저장소에 게시하고 잠금 원글·답글 2개는 pending으로 유지한다. 작성 vault의 해당 본문 백업 2블록을 정리했다. 사용자 요청으로 코드 게시와 blog.anyflow.net 정적 배포를 진행하며 기존 anyflow.net과 API 이미지는 유지한다. 최종 revision·운영 근거는 OPERATIONS.md에 기록한다.

## 2026-10-14 전수 점검 결함 수정 — 미리보기·게시 대기

GitStore 읽기는 raw state5초캐시·동시요청공유·호출별복사로 처리하고 쓰기 전후 무효화·fresh fetch를 유지한다. clone 포함 Git maintenance·gc를 foreground로 실행해 detached 유지보수 프로세스를 막는다. Git 관련10개 테스트 통과, 기존 운영좀비84개는 정리하지 않았다. Blade Runner 강조 백업 제목 수집을 보완하고4댓글·2답글관계를 복원해 private작업사본227개·preview230개이며 기존원본·Like·설정을 보존했다. 본문백업만 정리하고 이미지·원본을 보관했다. 관련2개 테스트를 통과했다.

C++/CLI 표 코드8개셀 개행을 재변환하고 bare Markdown파일명 자동링크를 차단했다. 명시적URL·링크는 유지한다. 관련6개 테스트와3개렌더fixture수정테스트를 확인했다. 캐노니컬 vault의 해당2글과 .cache/blog를 동일하게 반영했고 preview빌드397글·879자산·미해결0, preview20동시조회0.242초를 확인했다. 이 성능은 origin 없는 preview 결과이며 운영성능으로 주장하지 않는다. 댓글 권한안내는 댓글textarea placeholder에 합치고 별도행을 제거했다.

소스·콘텐츠·추가복원자료·문서는 미커밋이며 운영배포는 하지 않았다. Notion미해결참조2개·과거외부404링크42개는 사용자결정대기로 남긴다. 전체전수검증은 이미1회 수행해 반복하지 않고 변경범위만 재검사했다. 상세는 개인TODO와 OPERATIONS.md를 따른다.

## 2026-10-14 감사 수정 운영 반영 완료

코드2b45cd1·콘텐츠020cdb0·댓글358c4b5를 게시했다. 사이트와 API는 release-20261014-2b45cd1로 교체했고 두 Deployment Ready1/1·재시작0을 확인했다. 운영 Blade Runner4댓글·본문백업제거, 표8개셀 개행·파일명가짜링크제거·안내placeholder를 확인했다. 운영동시20조회는 모두200·전체2.509초였고 새API 좀비0개·이전API Pod종료를 확인했다. Notion참조2개·외부404링크42개 결정대기는 유지한다. 전체전수검사는 반복하지 않았다. 최신 imageID와 범위는 OPERATIONS.md를 따른다.

## 2026-10-14 관리자 작성 UI 운영 반영

코드c45695c와 사이트·API release-20261014-c45695c를 운영에 반영했다. 관리자 로그인 시 새 댓글·답글·수정창의 이름/링크 입력을 숨기고 disabled 처리하며 서버의 고정 관리자 이름·홈페이지를 사용한다. 다른 작성자의 댓글 수정은 body만 보내 작성자 정보를 보존한다. 관리자 브라우저2개의 독립 인증·전체댓글 관리권한·로그아웃을 운영에서 읽기검증했고 댓글 내용은 변경하지 않았다. 관련3개 테스트통과, 운영 Chrome의 새글/수정창 숨김과 각Deployment Ready1/1·재시작0을 확인했다. source비밀키값은 Git/로그에 기록하지 않는다.

이번 채팅 세션에서는 별도지시가 없으면 변경 후 commit·push·미리보기 반영까지 진행한다. 운영 배포는 사용자가 별도로 요청한 범위에서 수행한다. 전체 전수 검증은 반복하지 않는다.

## 2026-10-14 참조 복구 — 게시·미리보기 완료

사용자 승인 정책으로 Agile OCP참조는 기존 OCP글에 연결하고 DNS대상불명 참조구절만 제거했다. 외부42개 중 동일자료 새주소·고정Git이력24개, 실제원문을 확인한 Wayback8개로32개를 복구했다. 확인하지 못한10개는원URL보존한다. 콘텐츠1e2ebed는24파일(23MD·1HTML첨부)의참조대상을수정해게시했고미리보기397글·879자산·미해결0으로빌드했다. 수정24개페이지/첨부HTTP200,32대체주소반영·이전href제거를확인했다. 표시문구·본문·이미지는보존했다. 이번운영배포·전수재검증은없으며기존서비스는 release-20261014-c45695c다. 이 링크정책의사용자결정대기는해소됐다. 자세한근거는Mac outputs/blog 전수 검증/링크 복구 결과.md에보관한다.

## 2026-10-14 링크 복구 운영 반영 완료

사이트 release-20261014-3b63703·콘텐츠1e2ebed를 운영에 반영했다. Pod anyflow-blog-76444df564-ghnww는 Ready1/1·재시작0, imageID sha256:6c8cc1032e650c9db7924e9fe8acbd8896646a03db859d7efb367ce99d943e37다. HTTPS로 변경24개페이지/첨부200·외부32대체URL반영·이전href제거·Notion2수정을 확인했다. 확인불가10개는승인한원문보존정책유지,API이미지 release-20261014-c45695c·기존anyflow.net·라우팅은변경하지않았다. 전수재검증은없다.

## 2026-10-14 배포 manifest 종류별 통합

Service2개는 deployment/services.yaml, Deployment2개는 deployment/deployments.yaml에서 관리한다. 기존 service.yaml·deployment.yaml·comments-api.yaml을 통합하고 Makefile의 이미지 추출·배포·삭제 파일 참조를 갱신했다. 이미지 추출은 metadata.name으로 두 Deployment를 구분한다. 기존 delete/recreate의 정적 블로그만 삭제하는 동작과 댓글 API 보존을 유지한다. 새 정의4개와 이전 정의의 객체 동일성·운영 kubectl diff0·make dry-run을 확인했다. 리소스 설정·이미지·Secret과 라우팅 파일은 유지했다. 코드0f6b0e7를 commit·push하고 make deploy로 운영 적용했다. 두 Service·Deployment는 unchanged이고 Pod UID·이미지·재시작 수가 유지됐으며 각 Ready1/1을 확인했다. 블로그·댓글 API의 HTTPS200과 운영 댓글4개 조회를 확인했다.

## 2026-10-15 초기 HTTP 자동 게시 구현 — CronJob 방식으로 대체

GitHub Actions에서 GHCR 이미지 생성 후 deployment/deployments.yaml을 digest로 갱신하고 commit·push한다. 콘텐츠 repo는 코드 repo workflow_dispatch를 호출한다. 홈 서버는 OpenRC 수신기에서 HMAC 인증 요청을 받아 전용 checkout을 fetch·ff-only하고 make deploy를 실행한다. Argo CD는 사용하지 않는다. 코드 repo BLOG_DEPLOY_ENABLED=false이며 운영 활성화와 registry Secret·콘텐츠 dispatch token은 OPERATIONS.md 자동 게시 절차를 따른다. 이번 변경은 운영 리소스에 적용하지 않는다.

## 2026-10-15 Kubernetes CronJob pull 배포

최종 합의는 GitHub Actions의 이미지·YAML digest 게시와 Kubernetes CronJob의 1분 Git pull·make deploy다. OpenRC 수신기·HMAC·배포 API·host cron은 사용하지 않는다. deployment/cronjob.yaml, Dockerfile.deploy, scripts/poll-deploy.sh와 전용 RBAC·PVC로 관리한다. 자격증명은 등록했고 토큰은 만료 없음이다. 코드308875b·콘텐츠7058cd3을 게시하고 CronJob을 활성화했다. 실제 push→이미지·YAML27ff214→Job29866691의 rollout 성공을 확인했다. 테스트9개·RBAC 제한·변경 없음 생략·운영/preview200을 확인했다. 최신 결과와 검증 범위는 OPERATIONS.md를 따른다.

## 2026-10-15 추가 도메인 HTTP 라우팅

사용자 요청으로 HTTPRoute anyflow-blog에 www.anyflow.net·anyflow.net을 추가하고 상위 Gateway public-gateway에 HTTP 리스너와 anyflow.net HTTPS를 연결했다. www.anyflow.net도 인증서 발급 Ready=True와 HTTPS 리스너 적용을 완료했다. 사용자가 DNS를 홈 서버로 변경했다. 인증서는 상위 certificate/anyflow-net.yaml·www-anyflow-net.yaml에서 기존 cert-manager HTTP-01 방식으로 관리하며 상위 Makefile의 블로그 생성·삭제에 포함한다. 대표 URL·canonical·OG는 https://anyflow.net을 사용한다. 기존 blog.anyflow.net의 HTTPS는 유지한다.

## 2026-10-15 대표 URL·운영 관리자 키 교체

site.url은 https://anyflow.net이다. 관리자 키는 운영 Secret에서 관리하며 Git·문서에 값을 넣지 않는다. 서명 secret의 최소 32자와 관리자 키의 최소 8자 검증을 구분한다. 키 변경 시 관리자 쿠키 서명이 달라져 기존 로그인은 무효화된다. www·blog 도메인의 redirect는 이번 변경 범위에 포함하지 않는다.

코드22a309a·배포 선언15ed5c6을 게시하고 정적·댓글 API의 새 digest rollout을 확인했다. 홈·대표 글 canonical·og:url은 anyflow.net이다. 운영 관리자 키를 Secret에서 교체하고 API를 재시작했으며 새 키 로그인200·이전 키401·이전 관리자 세션 무효화·검증 세션 로그아웃을 확인했다. 키 값과 쿠키는 문서·Git에 넣지 않았다. 관련 테스트3개와 미리보기 빌드를 확인했고 전수 검증은 반복하지 않았다. 2026-10-15 기존 GA4 속성333773406의 실시간 page_view → page_location에서 운영 검증 URL https://anyflow.net/blog-construction/prepare?ga_verify=20261015-check-1과 이벤트1건 수신을 확인했다. 운영 페이지 측정 ID는 G-YWPHXJFYET이며 태그 설정·시험 이벤트를 추가하지 않았다.

## 2026-10-15 YouTube 북마크 카드

Notion bookmark가 일반 Markdown 링크로 변환된 YouTube 항목은 공통 obsidian-markdown 렌더러에서 썸네일·제목·YouTube 주소가 있는 북마크 카드로 표시한다. 한 문단 전체가 단일 YouTube 링크인 경우에만 적용하며 문장 안 링크·여러 링크·코드 예제·이미지 링크는 유지한다. youtube.js의 URL 검증·썸네일 추출을 재사용하고 생성 이미지도 기존 카드 대표 이미지 수집에 포함한다. 글 Markdown과 기존 영상 iframe은 변경하지 않았다. 코드f67e26a의 관련 테스트1개·미리보기 빌드와 Blade Runner 다크 화면에서 높이110px·썸네일 로드·가로 넘침 없음을 확인했다. 전수 검증은 반복하지 않는다.

[Actions38677509011](https://github.com/anyflow/anyflow-blog/actions/runs/38677509011) 성공과 배포 선언c70f26a의 정적 rollout을 완료했다. 운영 www.anyflow.net/liberalart/blade-runner에서 북마크 카드 HTML·높이110px·썸네일 로드를 확인했다. 미리보기와 운영에 반영했으며 글 본문과 일반 링크는 보존했다.

## 2026-10-15 원본 북마크 카드 복원

원본 Notion bookmark279개·82글의 제목·설명·커버·favicon을 콘텐츠 _assets/bookmarks.json에 글 고정 ID별로 보관한다. 글 Markdown은 재작성하지 않는다. 공통 렌더러는 독립 링크의 원본 URL·제목으로 해당 글의 북마크만 매칭하며 현재 링크 주소를 유지해 기존 링크 복구를 보존한다. lib/bookmark.js가 카드 HTML을 안전하게 직렬화하며 향후 Notion importer도 같은 함수를 사용해 북마크 정보를 유지한다. favicon은 Recent 자동 대표 이미지 수집에서 제외하고 커버만 후보로 사용한다. 원본 커버·favicon URL을 사용하며 자동 외부 페이지 크롤링은 추가하지 않았다.

코드f609c05·콘텐츠85a9453을 게시했다. 관련 테스트3개와 미리보기 빌드를 확인했다. 복원 범위의279카드·82글 매칭 누락0, OpenTelemetry의15카드와 대표 카드의 favicon·커버 로드를 확인했다. 전체 콘텐츠 전수 검증은 반복하지 않는다.

[Actions38678597379](https://github.com/anyflow/anyflow-blog/actions/runs/38678597379)과 배포 선언7ffe38a의 정적 rollout을 완료했다. 운영 OpenTelemetry의15개 북마크 카드·설명과 대표 카드 favicon·커버 로드를 확인했으며 raw bookmark catalog의 공개 자산 경로는404다. 정적 이미지만 갱신했고 댓글 API·배포 도구 이미지는 유지했다.

## 2026-10-15 접기 화살표·링크 색상·커버 높이

모든 본문 접기 callout은 info 이모지 대신 CSS 삼각형을 표시한다. 접힘은 오른쪽, 펼침은 아래 방향이며 native details/summary의 키보드·초기 open 상태를 유지한다. 일반 info callout의 아이콘은 유지한다. 본문 일반 링크는 라이트 #4A6F8F·다크 #8FB3D0이며 밑줄을 유지하고 hover에서 조금 더 선명하게 표시한다. 북마크·태그·메뉴 색상은 유지한다. PC·모바일 커버 높이는 사용자 승인한30vh이며 고정 최소·최대 높이 제한은 없다. 커버 없는 페이지 높이는 변경하지 않았다.

코드c63c827의 관련 테스트2개·미리보기 빌드와 OpenTelemetry의3개 토글·90도 화살표 회전·라이트/다크 링크색·북마크색 유지·모바일390×844 커버200px·가로 넘침 없음을 확인했다. viewport와 테마를 원래대로 복원했다. 전체 콘텐츠 전수 검증은 반복하지 않는다.

[Actions38679663108](https://github.com/anyflow/anyflow-blog/actions/runs/38679663108) 성공과 배포 선언889b2e3의 정적 rollout을 완료했다. 운영 OpenTelemetry에서 커버280px·라이트 링크 rgb(74,111,143)·공통 토글3개와 펼침90도 회전을 확인했다. 댓글 API·배포 도구 이미지는 유지했다.

## 2026-10-15 커버 높이30vh

코드477ba49에서 PC·모바일 커버를30vh로 통일하고 고정 최소·최대 높이와 모바일200px override를 제거했다. 커버 없는 페이지 여백150px·모바일120px는 유지한다. 미리보기 빌드와 PC1280×1080의324px·모바일390×844의253.2px를 확인했다. [Actions38682149912](https://github.com/anyflow/anyflow-blog/actions/runs/38682149912) 성공·배포 선언813603d 적용 후 운영에서도 동일 높이를 확인했다. 댓글 API·배포 도구 이미지는 유지했으며 전체 콘텐츠 전수 검증은 반복하지 않았다.

## 2026-10-15 커버 상단 정렬

사용자 요청으로 홈·글 웹 커버의 object-position을50% 50%에서50% 0%로 변경했다. 가로 중앙·세로 상단이며 높이30vh는 유지한다. Obsidian 편집 화면 설정은 변경하지 않았다. 관련 커버 테스트3개와 미리보기 빌드를 확인했다. 전체 콘텐츠 전수 검증은 반복하지 않는다.

## 2026-10-15 홈·글 커버 정렬 분리

사용자 요청으로 홈(root) 웹 커버만50% 0%를 유지하고 모든 글 커버는50% 50%로 복원했다. 높이30vh와 Obsidian 편집 설정은 유지한다. 관련 커버 테스트와 홈·글 미리보기로 확인하며 전수 검증은 반복하지 않는다.

## 2026-10-15 댓글·Like 비동기 접수

기존 API 프로세스의 QueueStore가 PVC에 fsync한 뒤202를 반환하고 단일 async 처리기로 Git 저장을 수행한다. 브라우저는 즉시 표시하며 별도 작업 큐를 두지 않는다. request_id 중복 방지·Like sequence·댓글 version 충돌·재시작 replay·소유자/관리자 권한·기존 PR/승인/알림을 유지한다. API는1 replica·Recreate이며 anyflow-blog-comments-state1Gi PVC를 사용한다. 최초 PVC는 관리자 bootstrap으로 만들고 CronJob 권한은 유지한다. 상세 구조·실패·rollback 절차는 OPERATIONS.md의 동일 제목을 따른다.

관련59테스트와 실제 미리보기의 작성·답글·수정·연속 Like·삭제를 확인했다. 시험 댓글은 삭제했고 Git 차단 상태에서도 접수·조회가 Git 완료를 기다리지 않는다. 전체 콘텐츠 전수 검증은 반복하지 않았다.

코드ec12b58·[Actions38719434788](https://github.com/anyflow/anyflow-blog/actions/runs/38719434788)·배포 선언19f5aff를 게시했다. 정적·API rollout 완료, API Ready1/1·Recreate, 댓글 PVC Bound1Gi·큐0600·미완료0을 확인했다. 운영 GET200·preview=false·revision/tasks/refreshing 응답과 새 UI 코드를 읽기 검증했다. 관련59테스트 통과, Git 차단 HTTP 접수 작성26.2ms·수정21.5ms·삭제26.2ms는 격리 시험 수치이며 운영 쓰기 성능 실측이 아니다. 실제 preview 시험 댓글2개는 삭제했고 Like는 원래 상태로 복원했다. 운영 댓글·Like 쓰기 및 실제 알림 메일 재발송·전체 콘텐츠 전수 검증은 수행하지 않았다.

## 2026-10-15 www 대표 주소·자동 사이트맵

대표 주소는 https://www.anyflow.net이며 canonical·OG·sitemap·robots는 site.url을 따른다. sitemap.xml은 매 빌드에서 현재 공개 posts와 홈으로 재생성하며 noindex 글은 제외한다. 발행·삭제·draft 전환·permalink 변경은 사이트와 같은 배포에 반영한다. sitemap lastmod는 검증 가능한 수정일이 없어 넣지 않는다. RSS는 추가하지 않는다.

anyflow.net의 공개 페이지·정적 파일은 경로와 query를 유지해 www로301 이동한다. 기존 열린 페이지와 방문자 식별 이전을 위해 /api/는 apex에서도 유지한다. www 댓글 초기화는 apex /api/identity-migration을 credential 포함 GET으로 호출한다. 이 endpoint는 www Origin만 허용하고 기존 방문자 식별값을 HttpOnly·Secure·SameSite=Lax·Domain=anyflow.net·Path=/api의 별도 cookie로 이전한다. 기존 www cookie를 덮어쓰지 않으며 두 식별 hash의 댓글 소유권·대기 댓글·Like·작업 영수증을 함께 인식한다. Like ON은 기존 식별값 중 하나가 이미 누른 경우 중복 추가하지 않고 OFF는 자신의 이전/현재 식별값 모두 취소한다. 서명 secret·관리자 키·관리자 인증 cookie는 이전하지 않는다. apex에서만 로그인했던 관리자는 www에서 다시 로그인한다.

관련 테스트44개와 XML 파싱·www URL/중복 검사·nginx syntax를 확인했다. 미리보기 sitemap은397 URL이며 draft/noindex/삭제/주소 변경은 작은 fixture의 연속 재생성으로 검증했다. 전수 콘텐츠 검증은 반복하지 않았다. Search Console의 기존 sc-domain:anyflow.net 속성에 www 사이트맵이 이미 등록되어 있어 운영 배포 후 같은 URL을 재제출한다.

코드067c89b·[Actions38721591107](https://github.com/anyflow/anyflow-blog/actions/runs/38721591107)·배포 선언659d3cd의 정적·API rollout을 완료했다. 운영 sitemap.xml200·text/xml·397개 고유 www URL, robots 안내, 대표 글 canonical/OG의www 일치를 확인했다. apex 홈·글(query 포함)·sitemap의301 Location이 동일 경로/query의www를 가리킨다. 운영 identity-migration204·www CORS·Secure/HttpOnly/Domain/Path 속성과 관리자 cookie 미이전을 dummy visitor로 읽기 검증했다. 실제 댓글/Like 데이터는 변경하지 않았다.

기존 Search Console sc-domain:anyflow.net 속성에 https://www.anyflow.net/sitemap.xml을 재제출했고 ‘사이트맵이 제출됨’ 접수 확인과 제출일2026-10-15를 확인했다. 마지막 읽기2026-10-14·발견397은 기존 결과이므로 새 sitemap의 Google 재수집/재색인 완료로 주장하지 않는다. 전체 전수 검증은 반복하지 않았다.

## 2026-10-15 Obsidian cardlink 렌더링

Auto Card Link Enhanced의 fenced cardlink YAML을 공통 Markdown 변환 단계에서 기존 bookmark 카드 HTML로 렌더링한다. url·title·description·image·favicon을 사용하며 본문 순서·기존 카드 UI를 유지한다. 로컬 [[이미지]]·![[이미지]]와 ICO favicon은 vault 내부 경로 검증 후 참조 자산으로 게시한다. favicon은 홈 카드 대표 이미지에서 제외하고 커버는 기존 첫 그림 자동 선택·OG에 연결한다. 이미지 없는 YouTube 카드는 기존 썸네일 대체를 사용한다. 일반 링크의 자동 변환 범위는 변경하지 않으며 빌드 시 새 메타데이터 조회는 하지 않는다.

잘못된 YAML·url·필드 타입은 해당 글 주소를 포함한 오류로 빌드를 중단한다. 제목·설명은 HTML escape하고 위험한 이미지 protocol은 제외한다. cardlink 문법을 설명하는 바깥 코드 블록은 그대로 유지한다. 관련6테스트·미리보기 빌드·격리된 localhost 시험 카드2개의 높이110px·이미지3개 로드를 확인했다. 시험 HTML은 _preview/_cardlink-review에만 만들었고 실제 글·vault·운영 게시물에는 추가하지 않았다. 전체 콘텐츠 전수 검증은 반복하지 않는다.

코드6115bbe·[Actions38724192774](https://github.com/anyflow/anyflow-blog/actions/runs/38724192774)·배포 선언4b2aab4의 정적 rollout을 완료했다. 기존 운영 북마크 페이지200과 시험 페이지의 운영404를 확인했다. 댓글 API·배포 도구 이미지는 유지했다. cardlink의 실제 표시는 격리된 로컬 미리보기에서 확인했으며 운영에 시험 게시물을 추가하지 않았다.

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

멀티미디어 캡션은 명시적 [!caption] callout을 사용한다. 바로 앞 이미지·Mermaid·영상·오디오·PDF·임베드·북마크에 소속되며 앞에 멀티미디어가 없으면 오류 없이 독립 캡션으로 표시한다. 일반 문단 추정은 하지 않는다. 웹·Obsidian에서13px·italic·테마 회색·미디어 아래4px·후속 본문과12px를 적용한다. 기존 캡션은 저장된 원본 정보로 확인해 전환한다.


## 2026-10-16 외부 commit 후 Obsidian Git 패널 갱신

Obsidian Git의 refreshSourceControl=true·refreshSourceControlTimer=7000은 주기적 polling이 아닌 vault 파일 변경 후 debounce다. 외부 터미널 commit/push의 .git 변경만으로 기존 Source Control 목록이 갱신되지 않을 수 있다. 강조 정리 후 실제 Git은 clean이고 로컬/GitHub HEAD가5aa8705로 같았지만 패널에는 이전80개 목록이 남았다. 패널 Refresh로 변경0개·staged0개를 확인했다. 이번 건은 Git index 상태 캐시 문제나 push 누락이 아니며 파일/설정을 변경하지 않았다.

작성 vault를 외부 Git 명령으로 commit/push한 작업의 완료 기준에 Obsidian Git Refresh와 실제 변경 수 확인을 포함한다. 기존 사용자 미커밋 변경은 남기고 정확한 상태를 보고한다. stale Working Tree diff 탭과 실제 Git 변경 목록을 구분한다. 새 watcher나 polling 설정·서비스는 추가하지 않는다.

## 2026-10-16 명시적 멀티미디어 캡션

캡션은 `> [!caption]` callout으로 작성한다. 바로 앞 이미지·Mermaid·영상·오디오·PDF·외부 임베드·북마크와 figure/figcaption으로 연결하고, 앞에 멀티미디어가 없으면 오류 없이 독립 캡션으로 표시한다. alt와 다음 문단 일치에 의한 추정을 제거했다. 웹과 blog vault의 notion-import snippet에서13px·italic·테마 회색·미디어 아래4px·일반 후속 본문과12px를 적용한다. 제목의 별도 여백은 유지한다.

원본 캡션 metadata와 현재 미디어를 대조해103글286캡션을 전환했다. 이미지223개와 이전 변환에서 빠졌던 bookmark42·video2·code19개의 캡션을 보존/복원했다. code19개 중 Mermaid5개는 그림과 연결하고 일반 코드14개는 독립 캡션이다. 원본 이미지가 Mermaid로 바뀐 글도 현재 캡션 내용과 인접 그림을 대조했다. 별도 자전거 초안1개의 기존 캡션도 전환했으며 draft:true를 유지했다. 전체104문서287캡션이다. 변경 문서의 본문·목록 구조·코드/Mermaid 원문 보존 대조와 관련5개 테스트를 통과했다. 안내·템플릿·CONTENT_CONTRACT와 개인 TODO를 갱신했다. 새 영구 변환기나 의존성을 추가하지 않았다.

소스e3c1770·콘텐츠ec1b769·개인 TODO66c4aff를 게시했다. [Actions38828348844](https://github.com/anyflow/anyflow-blog/actions/runs/38828348844)가1분14초에 성공했고 배포 선언92d29a3의 정적 rollout을 완료했다. 미리보기396글·868참조 자산·미해결0, 공개 캡션272개 연결/일반 코드14개 독립 표시를 확인했다. 운영 AI 플랫폼의 Mermaid 캡션3개·13px/italic, 폴스타4 영상 캡션과 Karma Police 북마크 캡션을 확인했다. 실제 Obsidian 읽기 보기에서 사진·Mermaid의13px/italic·4px 간격과 일반 후속 문단12px를 확인하고 원래 보기로 복귀했다. 작성 vault Git clean·Source Control 변경0개를 확인했다. 댓글 API·배포 도구 이미지는 유지했고 전체 기능 회귀·전수 시각 검증은 반복하지 않았다.


2026-10-16 사용자가 정정한 기준으로 캡션은 왼쪽 정렬하고 뒤 일반 본문 간격은20px로 늘린다. 미디어와 캡션 사이4px·13px/italic/테마 회색은 유지하며 웹과 Obsidian에 함께 적용한다.


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

## 2026-10-16 홈·일반 글 공통 Notion 스타일 정렬

카드에 한정하지 않고 홈·k8s workload·OpenTelemetry·에세이·여행 글의 원본 비교에서 확인한 공통 차이를 src/css/style.css에서 수정했다. 라이트 본문#2c2c2b·보조색#7d7a75·테두리#e6e5e3, 데스크톱 제목 위 여백9px/수직 padding0, 커버30vh/최대280px를 사용한다. 원본 Notion과 여행 글 제목의 top308px/높이96px가 일치한다. 모바일 제목 크기와 위 여백은 기존 반응형 설정을 유지한다.

표14px/20px·셀7px9px·헤더500, 본문 소제목 위 여백30/26/22px·아래6px, 인용문 text inset과 코드36px22px/모서리10px를 맞췄다. 코드 배경은 원본 rgba(66,35,3,.03), 다크 rgba(252,252,252,.03)이며 기존 highlight.js에 Notion 구문 강조 팔레트를 적용하고 YAML key는 light#07a/dark#66a2cc다. 원본 Prism과 highlight.js의 토큰 분류 차이는 남으며 엔진/의존성을 교체하지 않았다.

접기는 배경 없는 삼각 화살표 행으로 바꾸고 native details의 초기 상태·키보드 동작을 유지한다. 콜아웃은 모서리10px·padding12px·light#f9f8f7/dark#202020다. 홈 Recent 카드 제목15px·By Category 제목14px로 조정했다. 기존 문단16px 간격, 캡션13px italic/왼쪽/뒤20px, 사진 열 비율, 링크 카드, 댓글 UI·검색 동작은 유지한다.

관련 렌더 테스트2개 통과, Eleventy 미리보기 갱신과 홈97px 소개 카드/목록 글자 크기·여행 글 제목/캡션·k8s 표·OpenTelemetry 접기/코드/콜아웃의 표시를 확인했다. 다크 팔레트와 YAML key,390px viewport의 가로 넘침 없음과 표14px/폭342px,1000px 세로 viewport의 커버280px 제한을 확인하고 라이트/기본 viewport로 복귀했다. 실제 모바일 기기와 전체 콘텐츠·기능 전수 검증은 반복하지 않았다. 콘텐츠 저장소는 변경하지 않았으며 이번 범위는 commit·push·미리보기까지다. 운영 배포는 실행하지 않는다.


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


## 2026-10-17 불필요한 이전 첨부 주소 호환 제거

사용자 결정에 따라 이전 공개 첨부 주소 symlink 생성 코드·테스트·빌드 호출을 제거했다. 새 첨부 경로와 글 URL만 사용한다. 이전 절의 자산 alias 검증은 제거 전 이력이다. 로컬 vault의 옛 글 폴더46개는 .DS_Store만 있어 macOS 휴지통으로 옮겼다. 실제 MD·새 _assets 파일은 유지했다.

소스625392c·Actions38970262724(1분20초) 성공·배포 선언a81d985로 정적 이미지 sha256:f1b0be1a7b9939257fc5999548892bdaf59e0068de3923e8f92c33f12f722c47의 운영 rollout을 완료했다. 미리보기396글·872참조 자산·미해결0, 미리보기/운영 컨테이너의 첨부 symlink0을 확인했다. 운영 캐시 우회 조회에서 이전 첨부 주소404·새 주소200(image/webp), 대표 글200이다. 댓글 API·배포 도구 이미지는 유지했다. local blog Git clean·origin 일치와 Obsidian Git 패널 Changes0을 확인했다.
