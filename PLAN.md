# PLAN

## 목표

anyflow.net의 UI를 최대한 재현하고 Obsidian과 홈 서버로 이전한다. 현재 범위는 대표 UI 검증, 코드 게시와 blog.anyflow.net 배포다. 기존 anyflow.net은 유지한다.

## 단계

### 1. Vault와 Git 준비 — 완료

- iCloud의 독립 blog vault로 글·첨부를 이전한다.
- 비공개 `anyflow/blog` 저장소에 초기 콘텐츠를 commit·push한다.

### 2. 대표 화면 구현·비교와 blog.anyflow.net 배포

- 홈, `/sw-engineer/install-istio-in-production/`, `/trip-northen-europe/freiberg-potsdam/`을 사용한다.
- 원본 커버·아이콘·본문 폭·제목·속성 표·목차·카드·카테고리 목록을 재현한다.
- 원본 398개 페이지의 시각 자산을 저장하고 글 394개와 홈에 연결했다. slug가 없는 글 8개도 원본 UUID로 수집하고, 최신 글 3개는 자산만 확보했다.
- 공개 대상만 변환하고 원문·설정 파일을 출력에서 제외한다.
- PC 1280×720, 모바일 390×844에서 밝은 화면과 다크모드를 비교한다.
- 전체 글을 빌드하되 대표 화면에 대한 검증과 전체 콘텐츠 검수를 구분한다.
- 콘텐츠 5a9e126을 사용하고 코드는 비공개 anyflow/anyflow-blog에 게시한다. 고유 이미지 태그로 blog.anyflow.net을 갱신하고 실제 응답을 검증한다.

### 3. 전체 콘텐츠와 기능

- 누락 글과 미해결 링크를 정리한다.
- 작성 템플릿, 검색, RSS, sitemap, OG 메타데이터를 구현한다.
- 기존 permalink와 UUID 주소 연결, Disqus 댓글·좋아요 보존을 검증한다.

### 4. 작성·게시 자동화

- iCloud와 Git의 실행 주체를 정하고 수동 commit 이후 자동 push를 구성한다.
- GitHub Actions와 홈 서버의 self-hosted runner를 연결한다.
- 공유 볼륨으로 공개 결과를 교체하고 동시 게시와 실패를 처리한다.

### 5. 운영 전환

- 새 글·수정·첨부 변경과 빌드 실패를 실제 URL에서 검증한다.
- 전체 콘텐츠를 확인하고 별도 승인을 받은 뒤 anyflow.net으로 전환한다. 이번 배포에서는 기존 anyflow.net을 유지한다.
