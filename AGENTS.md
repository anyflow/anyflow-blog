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
- 이번 배포 대상은 blog.anyflow.net만이다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 콘텐츠는 anyflow/blog의 5371f9a를 깨끗한 작업 사본에 동기화했다.
- 전체 글의 빌드 통과와 전체 콘텐츠의 시각 검수, 사용자 UI 승인을 구분한다.
- 카드 갤러리 구현 당시 미리보기에서 공개 글 397개와 참조 첨부 926개를 생성했다. 운영 profile 이미지는 이전 첨부 구성을 유지한다. Notion 변환 글 396개와 기존 Markdown 보존 글 1개를 구분한다. 원본 블록 전체 대조, 이미지 645개 디코딩과 기존 미해결 참조 정리를 완료했다. 원본에서 목적 블록을 찾지 못한 8종 링크는 해당 글로 연결한다.
- 현재 배포 태그는 profile-20261013-5371f9a이며 본문 글꼴의 가장자리 처리는 원본과 같은 auto다. 실제 코드·콘텐츠 revision과 런타임 증거는 OPERATIONS.md에 기록한다. profile 배포 당시 홈 서버 회귀 테스트는 24/24이며 실행 Pod의 정적 파일 2,043개와 빌드 결과를 대조했다. 최신 배포 revision과 실제 검증은 OPERATIONS.md에 기록한다.
- 서버 재부팅 후 기존 루트 make port_forward가 필요할 수 있다. 호스트 DNS·기본 라우트는 변경하지 않았다.

## 4단계 표시·작성 개선 — 운영 배포 보류

- Mermaid 축소의 원인은 전역 SVG 아이콘 스타일이었다. `src/css/style.css`에서 아이콘에만 적용하며 공개 글 9개·Mermaid 13개를 PC·모바일·라이트·다크와 테마 전환에서 검증했다.
- `cover_x`·`cover_y`가 없거나 비어 있으면 중앙을 사용한다. 기존 숫자 좌표와 `cover_position`은 유지하며 공개 글 397개·홈의 생성 데이터가 수정 전과 동일하다. 작성 vault의 템플릿에서 좌표 필드를 제거하고 안내를 수정했다.
- `src/js/image-viewer.js`가 본문 사진과 Mermaid의 확대 팝업을 제공한다. 원본 이미지·SVG를 사용하며 그림·배경·닫기 버튼 클릭과 Esc로 닫고 원래 그림으로 포커스를 복원한다. Mermaid SVG는 팝업을 닫으면 같은 노드를 본문에 되돌려 ID·테마·배치를 유지한다. 링크가 있는 이미지와 참조·알림 상자 아이콘은 제외한다.
- 카드 선택은 `thumbnail`을 사용하며 사진 링크 또는 현재 글의 Mermaid 블록 참조를 저장한다. 없으면 본문의 첫 사진·Mermaid·YouTube·X 이미지, 모두 없으면 텍스트다. 이전 export의 `hero_image`는 선택값에서 제외한다. 숨겨진 카드의 Mermaid는 Load more 뒤에 렌더링한다.
- `lib/youtube.js`와 `lib/x.js`가 소셜 iframe 이미지를 추출하며 Obsidian 갤러리도 같은 함수를 사용한다. 선택기 0.3.0에서 YouTube·X 선택값은 공개 이미지 URL이다. X는 Notion iframe으로 감싼 주소도 읽으며 게시물의 첨부 사진·동영상 포스터를 사용한다. 빌드 시 `lib/x-cache.js`가 `.cache/x-thumbnails.json`에 조회 결과를 보관한다. 조회 실패 시 다음 그림으로 넘어가며 텍스트만 있는 X의 이미지 생성은 하지 않는다.
- `base.njk`가 글별 OG 제목·설명·대표 이미지·절대 URL을 제공한다. 대표 이미지는 카드 사진·YouTube·X, 글 커버, 홈 커버 순이며 Mermaid는 커버를 사용한다. `site.url`은 현재 대상인 `https://blog.anyflow.net`이다.
- Obsidian 선택기 원본은 `integrations/obsidian-card-image/`다. blog vault에 Blog 카드 이미지 플러그인으로 설치·활성화했다. `npm test`의 pretest가 picker.js·diagrams.js와 기존 Markdown-it 14.1.1을 설치용 main.js로 패키징한다.
- 카드 갤러리 최초 구현 시 회귀 테스트 35/35를 확인했다. 이번 OG·YouTube 보완은 관련 테스트 4개와 폴스타4의 홈 카드·OG·Obsidian 갤러리만 확인했다. `_preview`를 갱신했으며 현재 Mac 미리보기는 `http://127.0.0.1:8765/`다. Git 게시까지 진행하고 사용자 요청에 따라 운영 배포는 보류한다.

## 5·6단계 방문 통계·댓글 — 구현·미리보기 완료, 운영 연결 보류

- 기존 GA4 계정 `100207646`·속성 `333773406`·웹 스트림 `4090770035`의 측정 ID `G-YWPHXJFYET`를 확인했다. `src/js/analytics.js`는 `anyflow.net`·`www.anyflow.net`에서만 로드하며 localhost·`blog.anyflow.net`은 측정하지 않는다. 기존 gtag·GTM·UA와 중복 초기화를 막는다. 새 코드의 실제 GA 수신과 UA 시절 export 백업 유무는 미확인이다.
- `lib/comments/`·`scripts/comments-server.js`·`src/js/comments.js`가 수신 API·Git 저장·Disqus와 유사한 UI를 제공한다. 방문자 쿠키는 1년, 관리자 쿠키는 7일이며 HTTPS에서 HttpOnly·Secure·SameSite=Lax를 적용한다. 공개 JSON에서 작성 권한 검증값·대기 댓글을 제외한다. Git 충돌 재시도와 재시작 후 PID 잠금 복구를 처리한다.
- 댓글 데이터는 비공개 `anyflow/blog-comments`에 보관한다. 신규 댓글·답글의 incoming 브랜치로 Actions가 PR을 만들고 승인 OFF는 자동 merge, ON은 관리자 승인 후 공개한다. Like·공개 댓글의 직접 수정·삭제는 main에 기록한다. 이 댓글 전용 Actions는 보류 중인 3단계의 블로그 전체 자동 배포와 별개다.
- 과거 댓글 198개(Disqus 79·이미지 119, 공개 196·삭제 2, 답글 102)를 62개 글과 홈에 이관했다. Like 95개 대상의 댓글 24·글과 홈 27을 보존했으며 0명시 대상은 62개다. 원본 XML·OCR·텍스트와 이미지 46개를 댓글 저장소에 비공개 보관한다. 확인한 백업 44블록은 작성 vault 본문에서 제거하고 원본 자산은 유지했다. Cassandra 글의 잘린 날짜가 있는 1블록은 확인 대상으로 남긴다.
- 데이터 저장소 `73c64351c9fe479ff05f2fd2c0fe061b566a91e6`의 [게시 Actions](https://github.com/anyflow/blog-comments/actions/runs/38418854320)가 성공했다. 실제 새 댓글의 PR 생성·승인 OFF/ON·메일 수신은 운영 연결 후 확인한다.
- OpenRC 미리보기는 Node 댓글 API 서버와 운영 Git에서 분리한 preview Git을 사용한다. 미리보기에는 과거 댓글·Like를 넣었으며 `http://127.0.0.1:8765/`에서 확인한다. 글 고정 `id`와 공개 `comments/catalog.json`을 사용하며 API는 운영 카탈로그 URL을 5초 캐시로 갱신할 수 있다.
- `Dockerfile`의 `comments-api` target·`deployment/comments-api.yaml`은 준비 단계다. API 이미지는 미빌드이며 태그는 `pending`이다. 운영 API Service 없이도 정적 nginx가 시작하도록 공식 entrypoint의 DNS resolver 템플릿을 사용하고 `nginx -t` 1회 통과했다. SSH 전용 키·관리자 설정은 비추적 `.cache/comments-runtime/`와 Kubernetes Secret에만 보관한다. 키·토큰 값을 문서·이미지·Git에 넣지 않는다.
- 사용자 승인 범위는 3단계 자동 배포·운영 배포·도메인 전환을 제외한 구현·미리보기·Git 게시다. 최종 UUID 주소 정리와 전수 검증은 전체 구현 TODO 완료 후 수행한다.

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
- 다크 팔레트는 사용자가 지정한 Notion 공개 렌더러의 `.notion-dark-theme` 색상 정의를 사용한다. 배경 `#191919`·본문 `#f0efed`·보조 글자 `#ada9a3`와 카드·코드·팝업을 미리보기에서 검증했다. 사용자 요청 범위는 commit·push까지이며 운영 배포는 수행하지 않는다. 운영은 profile 이미지의 기존 팔레트를 유지한다.
- 홈 소개 bookmark는 고정 높이 없이 옆 연락처 목록에 맞춰 stretch한다. PC·태블릿에서 양쪽 97px, 모바일 카드 228px을 확인했고 코드 `6699059`를 profile 이미지로 배포했다.
- `src/js/share.js`: 원본과 같은 Web Share OS 공유창·대체 메뉴와 링크 복사. 원본 SNS 아이콘 4개를 로컬에 보관하며 취소·권한 오류·URL 인코딩·복사 실패를 포함해 서버 테스트 24/24와 PC·모바일·다크·키보드 검수를 완료했다. 공유 코드 `c3517f6`과 콘텐츠 `5371f9a`를 share 이미지로 운영에 반영하고 새 공개 스크립트·아이콘과 Pod 파일을 검증했다.
- `src/js/vendor/`: Mermaid와 highlight.js 고정 버전 및 라이선스. 실행 시 외부 CDN을 사용하지 않는다.
- `tests/content.test.js`, `tests/import-notion.test.js`, `tests/build.test.js`: 원본 변환·Obsidian 형식·공개 경계·잘못된 입력 차단과 실패 시 결과 보존
- `lib/obsidian-markdown.js`, `lib/validate-content.js`: 알림 상자·캡션·수식·블록 링크와 생성 참조 검증
- `scripts/import-notion.js`, `scripts/audit-import.js`: 공개 원본의 일회성 재변환과 글별 블록 대조. 콘텐츠 `_assets/notion-import.json`은 비공개 검증 manifest다.
- `src/posts/`는 현재 입력이 아니다. 콘텐츠 작업 사본과 생성 결과는 Git 추적 대상에서 제외한다.
- Markdown 원문이나 설정 파일을 public output으로 passthrough하지 않는다.

## 검증 기준

전수 검증은 개인 vault의 `NOW/NEW BLOG/blog 이전 TODO.md`와 관련 spec의 구현 TODO를 모두 완료한 뒤 최종 단계에서 한 번만 수행한다. 보류 중인 GitHub Actions·Argo CD 자동 게시도 완료 조건에 포함한다. 공통 변환기 변경과 중간 배포에도 같은 기준을 적용한다.

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
- 기존 배포 갱신은 이 저장소에서 make load deploy를 사용한다. manifest의 고유 이미지 태그를 kind에 적재하고 삭제 없이 rollout한다. 루트 anyflow-blog-r은 삭제를 포함하므로 일반 갱신에 사용하지 않는다.
- GitHub 제공 runner의 빌드·GHCR 등록·Git 배포 선언 갱신과 홈 서버 Argo CD의 자동 Sync는 별도 Argo CD 설치 후 재개한다. Obsidian 자동 push와 운영 도메인 전환도 후속 단계다.
- 댓글·Like의 수신 API·UI·Git 저장과 과거 데이터 이관을 구현했다. 운영 연결·이미지 생성·배포는 보류하며 아래 5·6단계 기록을 따른다.

## 문서

GOAL.md, PLAN.md, ARCHITECTURE.md, CONTENT_CONTRACT.md, OPERATIONS.md를 함께 참조한다. 배포와 사용자 UI 승인은 별도 근거로 기록한다.
