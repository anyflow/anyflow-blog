# anyflow-blog

## Introduction

Obsidian Markdown으로 작성한 콘텐츠를 정적 블로그로 게시한다. [운영 사이트](https://www.anyflow.net)의 소스이며 콘텐츠와 댓글 데이터는 별도 저장소에서 관리한다.

## Summary

글을 Git에 push하면 GitHub Actions가 사이트와 컨테이너 이미지를 만들고, Kubernetes CronJob이 배포 선언을 가져와 적용한다.

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

사이트 설정과 배포 대상을 각 구성 파일에서 지정한다. 이 저장소의 배포 선언은 운영 사이트에 맞춰져 있으므로 별도 환경에서는 다음 값을 함께 조정한다.

| 대상 | 설정 위치 |
| --- | --- |
| 사이트 이름·대표 URL·작성자·GA4·카테고리 순서 | [src/_data/site.json](src/_data/site.json) |
| 콘텐츠 저장소·Kubernetes context | [Makefile](Makefile) |
| Actions의 콘텐츠 checkout·이미지 저장소 | [.github/workflows/publish.yml](.github/workflows/publish.yml) |
| 배포 checkout의 원격 저장소·브랜치 | [scripts/poll-deploy.sh](scripts/poll-deploy.sh) |
| 도메인·Gateway·네임스페이스·이미지·댓글 환경변수 | [deployment/](deployment/) |
| Obsidian 작성 도구 | [integrations/obsidian-blog-links/](integrations/obsidian-blog-links/) |

GitHub Actions는 콘텐츠 읽기용 `BLOG_CONTENT_READ_KEY`와 실행 시 제공되는 `GITHUB_TOKEN`을 사용한다. 콘텐츠 저장소의 workflow는 코드 저장소의 `publish.yml`을 `workflow_dispatch`로 호출하고 `content_sha`를 전달한다. `build_comments`·`build_deployer` 입력은 해당 이미지의 추가 빌드를 제어한다. 정적 사이트 이미지는 함께 생성한다.

Kubernetes에는 Gateway API·agentgateway CRD, 대상 네임스페이스와 Gateway, 스토리지를 준비한다. Secret은 별도로 등록한다.

| Secret | 용도 |
| --- | --- |
| `anyflow-blog-registry` | 이미지 다운로드 인증 |
| `anyflow-blog-comments` | 댓글 서명/관리자 설정과 댓글 Git SSH 인증 |
| `anyflow-blog-deploy-git` | 배포 선언을 읽는 Git SSH 인증 |

배포 context를 지정한 뒤 리소스를 생성한다. `make create`는 PVC·RBAC·정책·CronJob과 웹/API 리소스를 적용한다. 이후 CronJob이 1분마다 배포 디렉터리 변경을 확인한다.

```sh
make create KUBE_CONTEXT=YOUR_CONTEXT
```

일회성 반영은 `make deploy KUBE_CONTEXT=YOUR_CONTEXT`를 사용한다. 코드/콘텐츠 변경은 이미지 빌드와 배포 선언 게시를 거쳐 반영한다. 댓글 데이터 변경은 사이트 이미지 빌드와 독립적이다.

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
