# AGENTS.md

이 문서는 `apps/anyflow-blog` nested repo에 적용한다. 상위 my-cluster의 AGENTS.md를 함께 따른다.

## 작업 원본

- 소스의 기준은 alpine의 `/home/anyflow/workspace/my-cluster/apps/anyflow-blog`다.
- 수정·빌드·검증은 원격 소스에서 수행한다.
- 2026-10-13 문단 복원은 사용자 요청에 따라 Mac의 `/Users/anyflow/workspace/anyflow-blog`에서 수정·빌드·검증한다. 서버 접속 복구 후 원격 작업트리와 대조해 반영한다. 문단 복원 코드·콘텐츠는 사용자 승인으로 GitHub에 commit·push하고 운영 배포는 서버 접속 복구까지 대기한다.
- 같은 로컬 소스에서 사용자 요청의 검색 기능 정리를 구현·검증한다. 문단 복원은 코드 `c792373`·콘텐츠 `7fc3314`를 GitHub에 게시했다. 검색 변경의 commit·push는 사용자 승인 범위다. 운영 배포는 대기한다.
- 작성 템플릿·누락 콘텐츠 정리도 같은 로컬 소스와 iCloud blog vault에서 수행한다. 사용자 요청으로 코드·콘텐츠를 commit·push한다. 콘텐츠는 `5371f9a`이며 운영 배포는 별도 요청 전까지 수행하지 않는다.
- anyflow-blog는 my-cluster 안의 별도 Git 저장소다. 코드의 Git 이력을 이 저장소에서 관리한다.
- 콘텐츠는 비공개 `git@github.com:anyflow/blog.git`의 루트를 `.cache/blog/`에 동기화한다.
- iCloud의 독립 blog vault가 작성 원본이며 개인 obsidian-vault의 BLOG는 복구용 보관본이다.

## 현재 단계

- 대표 화면은 홈, Istio 설치 글, 프라이베르크·포츠담 여행기다.
- 대표 UI 12쌍 비교, 코드 commit·push와 blog.anyflow.net 배포를 완료했다.
- 이번 배포 대상은 blog.anyflow.net만이다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 콘텐츠는 anyflow/blog의 c3cd15e를 깨끗한 작업 사본에 동기화한다.
- 전체 글의 빌드 통과와 전체 콘텐츠의 시각 검수, 사용자 UI 승인을 구분한다.
- 로컬 입력에서 공개 글 397개와 참조 첨부 1,144개를 생성한다. Notion 변환 글 396개와 기존 Markdown 보존 글 1개를 구분한다. 원본 블록 전체 대조, 이미지 645개 디코딩과 기존 미해결 참조 정리를 완료했다. 원본에서 목적 블록을 찾지 못한 8종 링크는 해당 글로 연결한다.
- 현재 배포 태그는 font-20261013-c3cd15e이며 본문 글꼴의 가장자리 처리는 원본과 같은 auto다. 실제 코드·콘텐츠 revision과 런타임 증거는 OPERATIONS.md에 기록한다. 운영 배포 당시 회귀 테스트는 15/15이며 로컬 작성 템플릿·누락 글 작업은 21/21이다. 최신 배포 revision과 실제 검증은 OPERATIONS.md에 기록한다.
- 서버 재부팅 후 기존 루트 make port_forward가 필요할 수 있다. 호스트 DNS·기본 라우트는 변경하지 않았다.

## 핵심 구현

- `.eleventy.js`: 공개 글 데이터를 Eleventy에 연결하며 Nunjucks 템플릿만 생성 입력으로 사용한다.
- `lib/content.js`: 공개 대상 선별, Markdown·링크·첨부 변환, 목차·날짜·목록 데이터 생성
- `lib/search-index.js`, `src/js/search.js`: 공개 글 394개의 Pagefind 색인과 공통 검색 팝업·정확한 태그 필터. 로컬 테스트 18/18과 PC·모바일·라이트·다크 검증을 완료했다. 검색 구현·검증을 완료했으며 운영 배포는 대기한다.
- `scripts/build.js`: 별도 경로에서 빌드한 뒤 `_site` 또는 `_preview`로 전환, 이전 결과 한 개 보관
- `src/index.njk`, `src/post.njk`, `src/_includes/`: 홈과 상세 템플릿
- 콘텐츠 `_assets/visuals/manifest.json`: 원본 398개 페이지의 시각 자산과 Notion 원본 주소 대응. 커버 98개·이모지 이미지 172개를 vault에 보관한다.
- 글 397개와 홈에 `cover`·`cover_x`·`cover_y`·`icon`을 연결했다. Pixel Banner 3.6.18의 갤러리·이모지 선택기에 대응하며 이전 CSS 좌표도 읽는다. slug가 없는 글 8개도 원본 UUID 주소로 수집했다. 최신 글 3개의 속성·본문을 연결했다.
- `src/_data/visuals.json`: 대표 태그 표현과 속성이 없는 콘텐츠의 참고값. 작성자 속성을 우선한다.
- `src/_includes/icon.njk`: 작은 이모지는 캐시 이미지, 큰 이모지는 문자, 사용자 이미지 아이콘은 크기와 관계없이 파일을 사용한다.
- `src/css/`, `src/js/`: 표면 재현과 다크모드·목차·목록 펼치기·코드 복사
- `src/js/vendor/`: Mermaid와 highlight.js 고정 버전 및 라이선스. 실행 시 외부 CDN을 사용하지 않는다.
- `tests/content.test.js`, `tests/import-notion.test.js`, `tests/build.test.js`: 원본 변환·Obsidian 형식·공개 경계·잘못된 입력 차단과 실패 시 결과 보존
- `lib/obsidian-markdown.js`, `lib/validate-content.js`: 알림 상자·캡션·수식·블록 링크와 생성 참조 검증
- `scripts/import-notion.js`, `scripts/audit-import.js`: 공개 원본의 일회성 재변환과 글별 블록 대조. 콘텐츠 `_assets/notion-import.json`은 비공개 검증 manifest다.
- `src/posts/`는 현재 입력이 아니다. 콘텐츠 작업 사본과 생성 결과는 Git 추적 대상에서 제외한다.
- Markdown 원문이나 설정 파일을 public output으로 passthrough하지 않는다.

## 빌드와 검증

```sh
make sync
npm test
BLOG_OUTPUT_DIR=_preview npm run build
sudo rc-service anyflow-blog-preview status
```

- 현재 OpenRC `anyflow-blog-preview`가 상시 실행 중이다. 같은 포트의 npm run dev를 추가 실행하지 않고 수정 후 미리보기 빌드만 수행한다.
- 원격 미리보기는 127.0.0.1:18765에 바인딩한다. Mac의 LaunchAgent `net.anyflow.blog-preview-tunnel`이 127.0.0.1:8765로 연결한다. 양쪽 프로세스의 자동 복구를 검증했다.
- 갤러리 편집 내용의 웹 미리보기 반영은 콘텐츠 사본 동기화·재빌드가 필요하다. 게시 자동화는 아직 구성하지 않았다.
- PC 1280×720과 모바일 390×844에서 밝은 화면·다크모드를 원본과 비교한다.
- `git status`와 빌드 결과, 원본과의 화면 비교를 함께 확인한다.
- 서버의 GitHub DNS 조회가 실패하면 DNS 운영 설정을 임의로 바꾸지 말고 동기화 제약을 구분해 보고한다.

## 운영 구조와 배포

- 현재 기존 배포는 service namespace의 Deployment/Service anyflow-blog다.
- 공개 경로는 Gateway API HTTPRoute와 cert-manager 인증서로 blog.anyflow.net에 연결된다.
- agentgateway는 HTTPS·라우팅을, nginx는 정적 파일 제공을 담당한다.
- Dockerfile은 콘텐츠를 빌드 단계에서 사용하고 정적 산출물만 nginx 이미지로 복사한다.
- 기존 배포 갱신은 이 저장소에서 make load deploy를 사용한다. manifest의 고유 이미지 태그를 kind에 적재하고 삭제 없이 rollout한다. 루트 anyflow-blog-r은 삭제를 포함하므로 일반 갱신에 사용하지 않는다.
- GitHub Actions, Obsidian 자동 push, 공유 볼륨 게시, 운영 도메인 전환은 후속 단계다.
- 댓글·좋아요는 기존 Disqus의 보존 방식을 후속 검토한다.

## 문서

GOAL.md, PLAN.md, ARCHITECTURE.md, CONTENT_CONTRACT.md, OPERATIONS.md를 함께 참조한다. 배포와 사용자 UI 승인은 별도 근거로 기록한다.
