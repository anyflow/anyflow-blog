## Introduction

blog vault에서 카드 이미지를 고르는 Obsidian 플러그인이다. 사진·현재 글의 Mermaid·YouTube 썸네일을 갤러리로 표시하며 [Obsidian API](https://github.com/obsidianmd/obsidian-api)의 `MarkdownRenderer`와 `processFrontMatter`를 사용한다.

## Summary

`thumbnail`만 작성자의 카드 선택으로 사용하고 선택이 없으면 웹이 본문의 첫 사진·Mermaid·YouTube 썸네일을 사용한다.

- 명령 팔레트의 `Blog 카드 이미지: 카드 이미지 선택`, 왼쪽 이미지 아이콘, 글 파일의 메뉴에서 연다.
- 현재 글의 그림을 본문 순서로 표시하고 vault의 다른 이미지도 선택한다. 파일 이름·Mermaid·YouTube로 검색할 수 있다.
- `자동`은 thumbnail을 제거한다. 이미지 선택은 `[[vault/이미지.webp]]`, Mermaid 선택은 `[[#^블록ID]]`, YouTube 선택은 공개 썸네일 URL을 저장한다.
- Mermaid에는 필요한 경우에만 표준 Obsidian 블록 ID를 추가한다. 코드 편집·다른 다이어그램 삽입 후에도 ID가 유지되는 한 같은 그림을 사용한다.
- 선택 중 노트가 바뀌면 Mermaid 저장을 중단해 다른 수정 내용을 덮지 않는다. 닫히지 않은 코드 블록도 저장하지 않는다.

## 패키징과 설치

`npm test`의 pretest에서 `node scripts/package-card-picker.js`를 실행해 main.js를 갱신한다. picker.js·diagrams.js가 편집 원본이며 main.js는 설치용 단일 파일이다. 기존 의존성 Markdown-it 14.1.1의 배포 번들을 그대로 포함하고 바이트 보존을 검사한다. 추가 npm 의존성은 없다.

blog vault의 `.obsidian/plugins/blog-card-image/`에 `main.js`, `manifest.json`, `styles.css`, `markdown-it.LICENSE`를 복사하고 플러그인을 활성화한다. iCloud 동기화는 기존 vault 설정을 따른다. 실제 모바일 기기 동작은 별도로 확인한다.
