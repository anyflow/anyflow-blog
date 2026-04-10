# CONTENT CONTRACT

## 입력 범위

- 기본 입력은 `content/public/**/*.md`다.
- 정적 자산은 콘텐츠가 참조하는 asset tree와 별도 static asset tree로 나눈다.
- live site 자동 추출 결과도 최종적으로는 같은 Markdown 계약으로 변환한다.

## page 단위 원칙

- 각 문서는 self-contained publishing unit이다.
- 외부 공개 URL은 frontmatter의 `permalink`가 책임진다.
- 내부 directory 구조는 작성과 관리 편의를 따른다.
- 블로그 시스템은 page 중심으로 동작한다.

## frontmatter 필드

### required
- `title`: 공개 제목
- `permalink`: 외부 공개 URL의 절대 계약
- `created`: 게시 기준 시점
- `summary`: 목록, 검색, 메타 설명용 요약
- `category`: 정보 구조상 상위 분류
- `kind`: `post` 또는 `page`
- `slug`: 내부 식별용 slug

### optional
- `updated`: 마지막 수정 시점
- `tags`: 태그 배열
- `hero_image`: 대표 이미지 경로 또는 URL
- `canonical_source`: migration 원본 URL
- `draft`: 비공개 여부
- `toc`: TOC 노출 여부

## permalink 규칙

- 정식 공개 URL은 1차부터 clean URL만 사용한다.
- `permalink`는 `/section/slug` 형태를 기본으로 한다.
- 중복 permalink는 허용하지 않는다.
- 문서를 이동하거나 파일명을 바꿔도 `permalink`는 유지해야 한다.

## 내부 page model 요구사항

생성기는 frontmatter와 본문으로부터 아래 속성을 가진 내부 page model을 만들어야 한다.

- canonical permalink
- title and summary
- created and updated timestamps
- category and tags
- hero image and resolved assets
- normalized body blocks
- outbound and internal link references
- legacy URL aliases
- search index payload

## 산출물 계약

생성기는 최소한 아래 산출물을 만들어야 한다.

- 홈 페이지
- clean URL 기준 상세 페이지
- 카테고리 또는 섹션 목록 페이지
- 검색 인덱스
- RSS
- sitemap
- 정적 CSS JS image assets

## validation failure 조건

아래 조건은 build failure로 처리한다.

- required frontmatter 누락
- permalink 중복
- 잘못된 clean URL 형식
- 깨진 내부 링크
- 누락 asset reference
- 동일 page의 canonical 정보 충돌
