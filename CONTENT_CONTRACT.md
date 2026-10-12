# CONTENT CONTRACT

## 입력과 공개 대상

콘텐츠 원본은 독립 Obsidian blog vault와 비공개 `anyflow/blog` 저장소다. `make sync`는 저장소 루트를 `.cache/blog/`로 동기화한다. 카테고리와 글·첨부는 vault 루트 아래에 위치한다.

- `kind: post`이며 `draft: false`인 문서만 게시한다.
- frontmatter가 없는 문서와 초안은 생성 대상에서 제외한다.
- 글 폴더에 Markdown과 참조 첨부를 함께 둔다.
- `permalink`는 문서 위치와 독립적으로 공개 URL을 결정한다.

## 속성

작성자가 지정한 속성을 공개 화면에 반영한다.

| 속성 | 의미 |
| --- | --- |
| `title`, `permalink`, `created`, `category` | 게시에 필요한 제목·주소·날짜·분류 |
| `kind`, `draft` | 공개 대상 선별 |
| `summary`, `updated`, `tags` | 요약·수정일·태그 |
| `icon` | 이모지 문자 또는 이미지 상대경로. 빈 문자열은 아이콘 제거 |
| `icon_image` | Pixel Banner에서 선택한 사용자 이미지 아이콘. 지정하면 이모지보다 우선 |
| `cover` | 상세 커버의 상대경로 또는 Obsidian 이미지 링크. 빈 커버는 제거 |
| `cover_x`, `cover_y` | Pixel Banner가 저장하는 0–100 범위의 가로·세로 자르기 위치 |
| `cover_position` | 이전 CSS 위치 형식. 숫자 좌표가 없을 때 읽는 호환 속성 |
| `thumbnail` | 목록 썸네일 |
| `hero_image` | 기존 목록 썸네일 속성과의 호환 |

목록은 `created` 내림차순이며 날짜는 `YYYY/MM/DD`로 표시한다. 커버와 썸네일은 서로 다른 역할로 처리한다. 썸네일은 유효한 지정 이미지 또는 본문의 첫 이미지를 사용하며, 이미지가 없으면 본문 미리보기를 표시한다.

시각 자산은 콘텐츠 저장소의 `_assets/visuals/covers/`, `_assets/visuals/icons/`에 보관한다. `_assets/visuals/manifest.json`은 이모지 문자와 로컬 이미지의 대응, 원본 페이지별 시각 정보와 주소 대응을 기록하며 공개하지 않는다. 글의 `cover`, `cover_x`, `cover_y`, `icon`이 작성 원본이다. Pixel Banner 3.6.18의 커버 갤러리와 이모지 선택기로 편집한다. 저장 형식은 일반 경로와 `[[이미지]]`, `![[이미지]]`를 지원한다. 홈은 루트 `blog.md`의 같은 속성을 사용한다.

작은 이모지는 대응 이미지가 있으면 로컬 이미지를 사용하며, 큰 페이지 이모지는 원본 UI처럼 문자로 표시한다. 사용자 이미지 아이콘은 큰 페이지 아이콘에도 파일을 사용한다. 대응 이미지가 없는 이모지는 문자로 표시하며, `icon`을 변경하면 해당 문자에 맞는 이미지를 찾는다. 명시한 커버·아이콘 파일이 없으면 빌드를 실패시키고 이전 결과를 유지한다.

2026-10-12에 공개 원본 398개 페이지의 자산 270개(커버 98개, 이모지 이미지 172개)를 저장했다. 현재 vault의 글 394개와 홈에 시각 속성을 연결했다. 전체 공개 컬렉션의 페이지 ID 398개를 대조해 시각 정보를 모두 확보했다. slug가 없는 글 8개는 원본 UUID 주소로 연결했고, 아직 게시 속성·본문 이관을 완료하지 않은 최신 글 3개는 자산만 보관했다. 원본에서 이미지를 제공하지 않는 이모지 🫧·🩻·🛟는 4개 글에서 문자로 유지한다.

`src/_data/visuals.json`은 대표 화면의 태그 표현과 시각 속성이 없는 콘텐츠에 대한 참고값을 기록한다. 작성자가 지정한 아이콘·커버를 우선한다. 태그는 기록한 원본 입력 배열이 유지될 때만 참고 화면의 표시 이름·순서를 적용한다.

## 링크와 첨부

글의 상대경로를 실제 첨부와 공개 URL로 변환한다.

- Markdown 이미지·내부 링크, Wikilink, HTML 이미지·첨부 참조를 변환한다.
- 이전 Notion 폴더 이름이 남은 경로는 같은 글 폴더의 실제 파일로 연결한다.
- 참조한 허용 형식의 첨부만 `/assets/` 아래에 출력한다.
- 콘텐츠 루트 밖의 파일과 바깥을 가리키는 symlink를 허용하지 않는다.
- Markdown 원문, `.git`, `.obsidian`, 설정 파일과 미참조 첨부는 출력하지 않는다.
- Mermaid와 코드 블록은 로컬 브라우저 라이브러리로 표시한다.

## 검증

잘못된 게시 속성·날짜·permalink와 중복 주소는 빌드를 실패시킨다. 현재 미리보기는 원본부터 존재한 미해결 참조 7개를 리포트한다. 전체 링크 정리와 기존 UUID 주소·댓글 보존은 후속 콘텐츠 이관 단계에서 검증한다.

## Obsidian 선택기

blog vault에 Pixel Banner를 설치하고 커버 필드를 `cover`, 위치 필드를 `cover_x`·`cover_y`, 이모지 필드를 `icon`, 이미지 아이콘 필드를 `icon_image`로 연결했다. 커버 선택기는 `_assets/visuals/covers/`, 이미지 아이콘 선택기는 `_assets/visuals/icons/`를 기본 필터로 사용한다. 기존 문서 395개의 CSS 좌표를 같은 숫자 좌표로 변환했으며 본문은 유지했다. 플러그인의 다른 편집기 꾸밈 속성은 공개 블로그의 고정 UI와 별개다.

커버는 `Pixel Banner: 💾 Select Banner from Vault`, 이모지는 `Pixel Banner: 📰 Set Banner Icon Text / Emoji`, 위치는 `Pixel Banner: 🎯 Adjust Position, Size, & Style` 명령을 사용한다. 이모지 선택기는 기존 문자열에 붙이는 방식이므로 교체할 때 입력칸을 비운 뒤 선택하고 Insert / Update를 누른다.
