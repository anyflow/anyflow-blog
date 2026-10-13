# ARCHITECTURE

## 데이터 흐름

Obsidian의 글과 블로그 코드를 분리해 정적 결과를 생성한다.

```text
독립 blog vault → 비공개 anyflow/blog → .cache/blog
                                      ↓
                           lib/content.js 변환·선별
                                      ↓
                         Eleventy의 홈·상세 템플릿
                                      ↓
                     임시 빌드 + Pagefind 검색 색인
                                      ↓
                              _site/_preview
                                      ↓
                     agentgateway → nginx → 정적 파일
```

## 현재 구현

- `make sync`는 `anyflow/blog`의 저장소 루트를 동기화한다.
- Eleventy는 데이터로 구성한 공개 글과 Nunjucks 템플릿으로 홈·상세를 생성한다.
- 참조 첨부만 별도로 복사하며 Markdown 원문을 passthrough하지 않는다.
- 기존 `src/posts/`는 현재 생성 입력으로 사용하지 않는다.
- 빌드는 별도 경로에서 완료한 뒤 결과를 교체하고 이전 결과 한 개를 보관한다.
- `lib/search-index.js`는 공개 글의 생성 HTML만 Pagefind 1.5.2로 색인한다. 브라우저의 `src/js/search.js`가 전체 검색·태그 필터를 같은 팝업으로 제공하며 별도 검색 서버를 요구하지 않는다. 검색은 로컬 검증을 완료했고 운영 배포는 대기한다.
- Dockerfile은 콘텐츠를 빌드 단계에서 읽고 생성 결과만 nginx 이미지에 포함한다.
- 현재 운영 경로는 `blog.anyflow.net`의 기존 배포이며, UI 변경 검증은 별도 localhost 미리보기에서 수행한다.

## 후속 자동 게시

GitHub Actions와 홈 서버의 runner가 commit 이후 게시 작업을 수행하도록 구성한다.

`수동 commit → 자동 push → GitHub Actions → 검증·빌드 → 공개 결과 전환`

공유 볼륨을 이용한 nginx 파일 교체, 게시 동시 실행 제어, 실패·복구 검증은 후속 단계다. Disqus 댓글·좋아요를 보존하며 원본 UUID·URL은 내부 글 식별 대응표에 보관한다. UUID 별도 주소·redirect는 구현하지 않는다. UUID 주소로 발행된 글은 모든 기능 구현 후 최종 전수 검증 직전에 일반 permalink로 일괄 변경하고 관련 참조를 갱신한다.
