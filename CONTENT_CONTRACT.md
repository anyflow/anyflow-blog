# Content Contract

## Introduction

콘텐츠 디렉터리의 Markdown·첨부를 공개 URL과 정적 산출물로 변환하는 규칙을 정의한다. Obsidian은 작성 도구이며 빌드는 파일을 직접 읽는다.

## Summary

명시적으로 발행한 문서와 그 문서가 참조하는 자산을 게시한다. 파일 경로가 공개 URL과 댓글의 글 식별자다.

- `publish: true`인 문서만 게시한다. `publish`와 `noindex`는 YAML boolean을 사용한다.
- 루트 `blog.md`는 홈 `/`, 다른 글은 vault 상대경로에서 `.md`를 뺀 URL을 사용한다.
- 콘텐츠 원본·설정·비공개 메타데이터는 공개 출력에 포함하지 않는다.
- 글 경로 변경은 URL·댓글·Like에 영향을 주는 데이터 변경이다.

## 파일 구조와 주소

Markdown은 글 경로에, 미디어는 `_assets` 아래에 둔다.

```text
blog.md
engineering/
  example.md
_assets/
  engineering/example/
    diagram.webp
  _covers/
  _icons/
  _meta/
```

`engineering/example.md`의 URL과 댓글 `post_id`는 `/engineering/example`다. `title`과 `category`는 파일 경로와 독립된 속성이다. 제목 변경은 주소를 바꾸지 않고 폴더·파일명 변경은 주소를 바꾼다. 발행 글을 이동할 때 댓글·Like와 내부 참조도 함께 옮긴다.

`permalink`·`post_id`·`kind`·`draft`는 작성 속성으로 사용하지 않는다. URL에는 공백·`%`·`?`·`#`·역슬래시·제어문자를 사용하지 않는다. 빈 경로 조각과 `.`·`..`를 허용하지 않는다. 점으로 시작하는 파일/폴더는 읽지 않으며 `_`로 시작하는 경로의 Markdown은 게시하지 않는다.

글 URL은 끝 슬래시를 사용하지 않는다. 웹 서버는 `/engineering/example/`을 쿼리 문자열을 보존해 `/engineering/example`로 301 이동한다. 홈 `/`는 유지한다.

## 게시 속성

발행 글에는 제목·작성일·분류가 필요하다. 다음은 최소 게시 예시다.

```yaml
---
title: 예제 글
summary: 글의 핵심 내용을 설명한다.
created: 2026-01-01
updated: 2026-01-01
category: Engineering
tags:
  - Kubernetes
publish: true
noindex: false
cover: ""
icon: "📝"
---
```

| 속성 | 규칙 |
| --- | --- |
| `publish` | `true`만 발행. `false` 또는 속성 없음은 미발행 |
| `title` | 발행 글의 제목 |
| `created` | 유효한 날짜. 최신 글과 분류별 글 목록의 정렬 기준 |
| `category` | 비어 있지 않은 문자열. 폴더명과 독립적 |
| `summary` | OG 설명에 사용하는 요약 |
| `updated` | 선택 수정일 |
| `tags` | 태그 이름 배열 |
| `noindex` | `true`이면 외부 검색엔진 제외 메타와 sitemap 제외. 글 자체와 내부 검색은 공개 |
| `cover` | 상세 커버 이미지 경로 또는 Obsidian 이미지 링크. 빈 값은 커버 생략 |
| `icon` | 이모지 문자 또는 이미지 경로. 빈 값은 아이콘 생략 |
| `favicon` | 홈 `blog.md`의 브라우저 탭 아이콘 경로 |

홈의 제목·요약·커버·아이콘·본문은 `blog.md`에서 작성한다. `blog.md`가 없으면 사이트 설정을 사용하는 기본 홈을 생성한다. 일반 글은 `created` 내림차순이며 같은 날짜에는 URL 순으로 정렬한다. 카테고리는 발행 글에서 수집하고 `site.json`의 `categoryOrder` 순서를 우선한다. 지정하지 않은 카테고리는 뒤에 이름순으로 놓는다.

태그 색상은 원본 이름의 문자 코드 합계를 팔레트 크기로 나눈 값으로 정한다. 같은 이름은 같은 색상을 사용한다. 웹의 표시 이름은 하이픈을 공백으로 보여주며 검색 필터는 대소문자·하이픈·연속 공백 차이를 정규화한다.

## 본문과 첨부

표준 Markdown 문단·목록·제목·코드·표와 Obsidian 링크·임베드를 지원한다. 문단 사이 빈 줄은 한 줄로 작성하고 파일 끝에 빈 문단을 넣지 않는다. 코드 블록 내부 공백은 코드의 일부로 취급한다.

- 강조·기울임·취소선·인라인 코드는 `**강조**`, `*기울임*`, `~~취소선~~`, 백틱을 사용한다.
- 순서 목록은 `1.`, `2.`, `3.`으로 작성한다. 항목 안의 여러 문단·코드·하위 목록 구분은 유지한다.
- 내부 링크는 상대 Markdown 링크 또는 Wikilink를 사용한다. `#제목`과 `#^블록ID`, `^블록ID`를 지원한다.
- 이미지는 `![설명](<../_assets/engineering/example/diagram.webp>)` 또는 `![[이미지 경로]]`로 참조한다. `![설명|528](경로)`와 `![[이미지|528]]`는 폭을 지정한다.
- 오디오·영상·PDF 임베드와 일반 첨부 링크를 구분한다. 업로드한 HTML 첨부는 다운로드 응답으로 제공한다.
- 밑줄·표 셀 안 줄바꿈·외부 임베드처럼 필요한 HTML을 지원한다. 작성 Markdown은 신뢰하는 작성자의 입력이다.
- `mermaid` 코드 블록은 다이어그램으로 표시하고 `$...$`·`$$...$$` 수식은 빌드에서 KaTeX로 렌더링한다.
- `[!info]`·`[!tip]`·`[!warning]` 등의 callout과 `[!abstract]-` 접기를 지원한다. `[!notion]`은 제목 없는 전구 상자 형식이다.
- `[!columns]` 안의 중첩 `[!column|0.5]`는 열 배치를 표현한다. 비율은 0보다 크고 1 이하이며 좁은 화면에서는 세로로 배치한다.

명시적으로 참조한 허용 형식의 첨부만 `/assets/`에 출력한다. 콘텐츠 루트 밖의 파일과 바깥을 가리키는 symlink는 허용하지 않는다. Markdown 원문·`.git`·`.obsidian`·비공개 설정·미참조 첨부를 복사하지 않는다.

캡션은 바로 앞 멀티미디어와 명시적으로 연결한다.

```markdown
![설명](<../_assets/engineering/example/diagram.webp>)

> [!caption]
> 이미지에 대한 설명이다.
```

이미지·Mermaid·영상·오디오·PDF·임베드·북마크 다음의 캡션은 같은 figure에 연결한다. 앞에 멀티미디어가 없어도 오류 없이 독립 캡션으로 표시한다. 일반 문단이나 alt 텍스트로 캡션을 추정하지 않는다. 캡션은 14px·일반체·줄 높이 1.4·테마 회색·왼쪽 정렬을 사용한다. 캡션의 인라인 코드도 같은 글자 크기를 사용한다. 기본 캡션을 만들기 위해 내용을 이탤릭 강조 기호로 감싸지 않는다.

## 링크 표현과 작성 도구

링크의 표현 종류는 작성 Markdown에 명시한다. 문장 안 일반 링크를 URL 종류만으로 카드로 바꾸지 않는다.

| 표현 | 작성 방법 |
| --- | --- |
| 일반 링크 | `[제목](URL)` |
| 아이콘을 포함한 링크 멘션 | `[제목](<URL> "mention")` |
| 북마크 카드 | `cardlink` 코드 블록의 YAML |
| 작은 GitHub 미리보기 | `cardlink`에 `type: preview` 지정 |

````markdown
```cardlink
url: https://github.com/OWNER/REPOSITORY
title: 링크 제목
description: 선택 설명
```
````

`cardlink`는 `url`과 선택 필드 `title`·`description`·`image`·`favicon`·`type`을 사용한다. `type`은 `bookmark` 또는 `preview`다. 메타데이터가 필요하면 해당 링크를 조회하고 캐시하며 실패 시 기존 정보와 URL을 유지한다. 제목·설명은 HTML escape하고 이미지 주소를 검증한다. 잘못된 YAML·타입은 빌드 오류다. 독립 YouTube 링크는 썸네일 카드로 표시한다.

별도 `obsidian-common-ux` 저장소의 공통 UX 플러그인은 새 글 생성·분류 선택·커버/아이콘 갤러리·URL 붙여넣기 메뉴·링크 카드 표시를 제공한다. 새 글은 `publish: false`이며 기본 속성을 본문이 없는 Markdown 파일에 작성한다. 갤러리는 콘텐츠 저장소의 로컬 자산을 사용한다. 본문이 바뀌면 비동기 붙여넣기 변환은 대상 URL 범위를 확인하여 편집을 보존한다.

홈의 동적 목록은 독립 HTML 주석 `<!-- blog:recent -->`와 `<!-- blog:categories -->` 위치에 삽입한다. 각 표식은 한 번만 사용한다. 표식 앞 제목과 섹션 순서는 `blog.md`에서 정한다. 카테고리 제목은 접기 기능을 제공하지 않는다.

## 대표 이미지·검색·공개 출력

목록의 대표 이미지는 본문에서 처음 등장하는 사진·Mermaid·YouTube·X 이미지다. 대표 이미지가 없으면 텍스트 미리보기를 표시한다.

OG 이미지는 대표 이미지, 글 커버, 홈 커버 순으로 선택하며 모두 없으면 생략한다. Mermaid·SVG·ICO·AVIF 등의 대표 이미지는 빌드에서 PNG로 생성한다. YouTube·X는 공개 썸네일·사진·영상 포스터를 사용한다. 별도의 작성용 카드 이미지 속성은 두지 않는다.

Pagefind는 공개 글의 제목·태그·본문 HTML을 색인한다. 홈·내비게이션·다운로드 HTML 첨부·원본 Markdown은 색인하지 않는다. 태그 필터와 본문 검색은 같은 검색 UI를 사용한다. `noindex`는 Pagefind에서 글을 숨기지 않는다.

canonical·OG URL은 `src/_data/site.json`의 대표 URL을 사용한다. sitemap.xml은 매 빌드에서 홈과 `noindex`가 아닌 발행 글로 생성하므로 발행 취소·삭제·경로 변경도 다음 배포에 반영한다. robots.txt는 사이트맵 주소를 제공한다.

공개 댓글 카탈로그 `comments/catalog.json`에는 발행 대상의 ID·제목·주소·호환 별칭을 넣는다. 댓글 API는 카탈로그에 있는 글만 허용한다. 실제 댓글 원본·방문자 해시·설정·접수 기록·승인 대기 내용은 비공개 데이터다. 댓글과 Like 처리는 [ARCHITECTURE.md](ARCHITECTURE.md#댓글like-처리)를 따른다.

비공개 `_assets/_meta`의 시각/링크 메타데이터는 빌드에서 읽지만 원본 JSON을 그대로 출력하지 않는다. 누락 첨부·잘못된 내부 글/블록 링크·깨진 이미지 문법·잘못된 게시 속성은 빌드를 실패시키며 기존 공개 결과는 유지한다.


## Obsidian 작성 서식

공통 UX는 별도 `obsidian-common-ux` 저장소에서 관리한다. 운영 블로그의 본문 CSS를 기준으로 읽기 모드와 Live Preview를 맞추며, 설정·수정·배포 절차는 `obsidian-common-my` skill을 따른다. 블로그 저장소에서 Obsidian 플러그인을 빌드하거나 배포하지 않는다.

Mermaid는 GitHub에서 확인한 Mermaid12.1.0·ELK·Trebuchet 글꼴·줄바꿈 설정을 사용한다. MIT 라이브러리를 플러그인에 포함하며 런타임 CDN은 사용하지 않는다. 로컬 iframe에서 렌더링하여 Obsidian 본문 CSS의 영향을 차단하고, 결과 SVG는 기존 읽기/Live Preview 및 확대 기능에 전달한다. 문서의 Mermaid frontmatter 설정과 원문은 유지하며 플러그인 해제 시 기본 렌더러를 복구한다.

블로그 본문과 빌드의 카드·OG 다이어그램도 같은 로컬 Mermaid 라이브러리와 githubDefaults/createRenderer를 사용한다. 본문은 현재 테마를, PNG는 밝은 테마를 사용하며 렌더러·설정 변경 시 PNG 캐시를 무효화한다.

`> [!caption]`의 `>` 뒤에 탭 또는 코드 들여쓰기가 있어도 명시적 캡션으로 해석한다. Obsidian은 표시 단계에서만 보정하며 원문 탭은 유지한다. 일반 들여쓰기 코드 블록과 코드 예제 내부의 캡션 문법은 바꾸지 않는다.

캡션을 Live Preview에서 편집할 때도 캡션 글꼴을 유지한다. 인용문 테두리·탭 안내선은 숨기고, 표시된 인용문 접두사의 실제 폭으로 hanging indent를 계산하여 줄바꿈을 캡션 내용의 시작점에 맞춘다. 일반 인용문·다른 callout·코드 블록에는 적용하지 않는다.


### 표 셀 배경색

셀 내용 맨 앞의 `{bg:green}`을 셀 전체 배경으로 적용하며 표기는 화면에서 숨긴다. Obsidian의 표 셀을 우클릭해 색상 또는 ‘기본 배경’을 선택하면 Markdown 원문을 수정한다. 원문에서 표기를 직접 편집해도 같은 결과를 얻는다. 표 안의 인라인 코드와 일반 단락에서는 색상 표기를 해석하지 않는다.

```markdown
| 단계 | 상태 |
| --- | --- |
| 정상 | {bg:green} **정상 처리** |
| 위험 | {bg:red} 과부하 |
```

지원 색상은 `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`다. 표기는 밝은·어두운 테마별 공통 팔레트에 연결하며 셀별 색상은 첫 행·첫 열의 기본 회색보다 우선한다. 유효하지 않은 색상 표기는 원문 그대로 표시한다. 블로그는 다음 빌드·배포에서 같은 표기와 팔레트를 적용한다.
