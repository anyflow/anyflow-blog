# blog-app

## Introduction

Obsidian Markdown으로 작성한 콘텐츠를 정적 블로그로 게시한다. [운영 사이트](https://www.anyflow.net)의 소스이며 콘텐츠와 댓글 데이터는 별도 저장소에서 관리한다.

## Summary

콘텐츠 발행과 운영 배포는 각각 PR을 통해 진행한다. GitHub Actions가 이미지를 GHCR에 발행하고, Argo CD가 home-platform의 배포 선언을 운영 클러스터에 적용한다.

- Eleventy·Nunjucks로 HTML을 생성하고 Pagefind로 브라우저 검색을 제공한다.
- 댓글·답글·글/댓글 Like는 Node.js API와 비공개 Git 저장소로 관리한다.
- [ARCHITECTURE.md](ARCHITECTURE.md)는 구성 요소·배포·데이터 처리 구조를 설명한다.
- [CONTENT_CONTRACT.md](CONTENT_CONTRACT.md)는 파일 경로·게시 속성·Markdown 표현·공개 범위를 정의한다.

## 로컬 개발

Node.js 22, npm, 콘텐츠 디렉터리를 준비한다. Mermaid·SVG 등의 카드 이미지를 생성하려면 Chrome/Chromium과 한글 폰트가 필요하다. 브라우저를 자동으로 찾지 못하면 `PUPPETEER_EXECUTABLE_PATH`를 지정한다.

```sh
npm ci
BLOG_CONTENT_DIR=/path/to/vault BLOG_OUTPUT_DIR=_preview npm run build
python3 -m http.server 18765 --bind 127.0.0.1 --directory _preview
```

브라우저에서 `http://127.0.0.1:18765`를 연다. 최소 한 개의 발행 글이 필요하며 입력 예시는 [콘텐츠 규칙](CONTENT_CONTRACT.md#게시-속성)을 따른다. 기본 입력은 `.cache/blog`, 기본 출력은 `_site`다. `BLOG_OUTPUT_DIR`은 `_site` 또는 `_preview`만 허용한다.

Git 콘텐츠 저장소를 사용하면 다음 명령으로 동기화한다. 저장소 접근 자격증명은 로컬 Git/SSH에서 준비한다.

```sh
make sync VAULT_REPO=git@github.com:OWNER/blog-content.git
BLOG_OUTPUT_DIR=_preview npm run build
```

`make sync`는 `.cache/blog`의 원격 주소를 확인하고 fast-forward로 갱신한다. 저장소의 Makefile 기본값은 운영 콘텐츠 저장소를 가리킨다. 복제해서 사용할 때 자신의 콘텐츠 저장소로 바꾼다.

댓글까지 검토하려면 정적 서버 대신 다음 명령을 실행한다. 이 서버는 미리보기 정적 파일과 API를 함께 제공하고 별도의 로컬 댓글 저장소·설정·큐를 만든다.

```sh
BLOG_STATIC_DIR=_preview COMMENTS_PREVIEW=true node scripts/comments-server.js
```

기본 주소는 `http://127.0.0.1:18765`다. 미리보기의 댓글·Like는 운영에 반영하지 않는다. 생성된 설정 파일과 `.cache` 데이터는 커밋하지 않는다.

## 설정과 배포

사이트 설정과 배포 대상을 각 구성 파일에서 지정한다. 운영 Kubernetes 리소스는 home-platform에서 관리한다.

| 대상 | 설정 위치 |
| --- | --- |
| 사이트 이름·대표 URL·작성자·GA4·카테고리 순서 | [src/_data/site.json](src/_data/site.json) |
| 로컬 콘텐츠 저장소 | [Makefile](Makefile) |
| Actions의 콘텐츠 checkout·이미지 저장소 | [.github/workflows/publish.yml](.github/workflows/publish.yml) |
| 발행할 콘텐츠 커밋 | [content.lock](content.lock) |
| 발행한 이미지 버전과 입력 커밋 | [release.json](release.json) |
| 운영 도메인·Gateway·네임스페이스·댓글 환경변수 | [home-platform 배포 설정](https://github.com/anyflow/home-platform/tree/main/apps/anyflow-blog) |
| Obsidian 작성 도구 | [obsidian-common-ux](https://github.com/anyflow/obsidian-common-ux) |

콘텐츠 저장소는 `blog/main`이 바뀌면 `content.lock`을 갱신하는 PR을 연다. GitHub Actions가 지정된 콘텐츠 커밋으로 사이트를 검증하고 PR이 `blog-app/main`에 머지되면 이미지를 발행한다. 소스 변경도 `blog-app/main`에서 발행한다. 발행에 성공하면 `release.json`을 커밋하고 home-platform에 이미지 버전 갱신 PR을 연다.

| Actions Secret | 사용처 | 권한 |
| --- | --- | --- |
| `BLOG_PUBLISH_TOKEN` | `blog`의 콘텐츠 PR | `blog-app`의 Contents·Pull requests 쓰기 |
| `BLOG_CONTENT_READ_KEY` | `blog-app`의 콘텐츠 checkout | `blog` 읽기 |
| `GH_ACCESS_TOKEN` | `blog-app`의 운영 배포 PR | `home-platform`의 Contents·Pull requests 쓰기 |

운영 배포에는 Gateway API·agentgateway CRD, 대상 네임스페이스와 Gateway, 스토리지가 필요하다. home-platform의 Argo CD 애플리케이션이 웹/API 리소스, 댓글 PVC, 라우팅 정책과 SealedSecret을 적용한다.

HTTPRoute는 `/api` 경로를 댓글 Service로 직접 전달하고 그 외 경로는 nginx Service로 전달한다. URI를 재작성하지 않으며 두 규칙은 같은 도메인과 요청 제한 정책을 사용한다. 두 Service의 포트는 80이며 댓글 Service는 Node.js의 3000 포트로 전달한다.

home-platform의 배포 PR이 머지되면 Argo CD가 운영에 반영한다. 댓글·Like 데이터는 blog-comments에서 독립적으로 반영한다.

### 버전과 커밋 메시지

`make hooks`로 로컬 커밋 메시지 검사를 연결한다. GitHub Actions도 푸시된 새 커밋을 검사한다.

| 커밋 메시지 | 버전 |
|---|---|
| `type!:` 또는 `BREAKING CHANGE:` | major |
| `feat:` | minor |
| `fix:`, `perf:` | patch |
| `docs:`, `chore:`, `test:` 등 | 버전 변경 없음 |

`release.json`에 기록된 이미지별 소스 커밋 이후 가장 큰 변경 수준을 적용한다. 콘텐츠 SHA만 바뀌면 사이트 이미지만 patch를 올린다. GHCR의 버전 태그는 이미 발행한 이미지로 고정한다.

## 검증과 공개 범위

변경된 기능의 테스트와 대표 화면을 확인한다. 전체 콘텐츠·화면 조합 검사는 전체 변경을 마무리할 때 수행한다.

```sh
node --test tests/comments-ui.test.js
# 전체 테스트가 필요한 작업의 최종 검증
npm test
```

`npm test`의 사전 단계는 Obsidian 플러그인 번들을 갱신한다. 생성된 플러그인 파일의 변경도 함께 검토한다. 빌드는 게시 속성·첨부·내부 링크·검색 색인을 검증하고 성공한 결과만 공개 출력으로 전환한다.

소스 공개 범위에는 글 원본·댓글 원본·관리자 키·Git 개인키를 포함하지 않는다. 작성 Markdown은 신뢰하는 작성자의 입력으로 취급하며 HTML 표현도 지원한다. 댓글 입력은 HTML로 실행하지 않는다. 외부 YouTube·X·링크 메타데이터와 GA4는 해당 서비스의 네트워크와 정책을 따른다.

브라우저 라이브러리의 버전·라이선스는 [src/js/vendor/README.txt](src/js/vendor/README.txt)와 각 라이선스 파일을 참조한다.

카테고리 페이지는 `_categories/*.md`의 제목·커버·아이콘으로 구성하며 `/category/<slug>`에 게시한다. 홈과 같은 본문 스타일에서 Recent Posts 카드와 Older Posts 목록을 제공하고, 홈 카테고리 제목과 글 breadcrumb로 이동한다.
