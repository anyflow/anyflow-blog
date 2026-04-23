# CONTENT CONTRACT

## 입력 범위

- 콘텐츠 소스는 `obsidian-vault` 저장소의 `blog/` 디렉토리다.
- 포스트는 `src/posts/{category}/{slug}/` 디렉토리에 Markdown과 이미지가 함께 위치한다.
- 각 포스트 디렉토리가 self-contained unit이다 (글 + 참조 이미지).

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

### optional
- `updated`: 마지막 수정 시점
- `tags`: 태그 배열
- `hero_image`: 대표 이미지 경로 (포스트 디렉토리 기준 상대경로)
- `draft`: 비공개 여부
- `toc`: TOC 노출 여부

## permalink 규칙

- 정식 공개 URL은 1차부터 clean URL만 사용한다.
- `permalink`는 `/{category}/{slug}` 형태를 기본으로 한다.
- 중복 permalink는 허용하지 않는다.
- 문서를 이동하거나 파일명을 바꿔도 `permalink`는 유지해야 한다.

## 이미지 규칙

- 이미지는 포스트 Markdown과 같은 디렉토리에 위치한다.
- 본문과 hero_image 모두 상대경로로 참조한다.
- 빌드 시 이미지는 permalink 경로에 맞게 출력된다.

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
