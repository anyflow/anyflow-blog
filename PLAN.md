# PLAN

## 목표

anyflow.net의 UI를 최대한 재현하고 Obsidian과 홈 서버로 이전한다. 공개 글 397편과 대표 UI·검색·작성 개선을 준비했으며 기존 anyflow.net을 유지한다. 2026-10-14 사용자 요청으로 blog.anyflow.net 운영 배포를 진행했다. 3단계 자동 배포와 anyflow.net 도메인 전환은 보류한다.

## 작업·검증 기준

세부 순서와 완료 상태는 개인 vault의 `NOW/NEW BLOG/blog 이전 TODO.md`를 기준으로 한다. 기능별로 변경 로직의 관련 테스트와 대표 사례만 확인한다. 보류 중인 3단계를 포함한 모든 구현 TODO와 관련 spec을 완료하고 최종 UUID 주소 정리까지 마친 뒤 전수 검증을 최종에서 한 번만 수행한다. 공통 변환기 변경과 중간 배포도 예외로 삼지 않는다. 상세 기준은 `AGENTS.md`와 `OPERATIONS.md`를 따른다.

## 단계

### 1. Vault 분리와 Git 저장소 준비 — 완료

- iCloud의 독립 blog vault를 작성 원본으로 사용하고 비공개 `anyflow/blog`에 글·첨부·작성 설정을 보관한다.
- 코드는 alpine의 `apps/anyflow-blog`, 개인 문서는 `anyflow/obsidian-vault`에서 관리한다.

### 2. 대표 UI·콘텐츠 정상화와 blog.anyflow.net 배포 — 완료

- 커버·아이콘·본문·다열·캡션·알림 상자·수식·블록 참조·문단 간격을 복원하고 공개 글 397편을 구성했다.
- Pagefind 본문 검색·정확한 태그 필터·원본 Share 동작과 작성 템플릿을 운영에 반영했다.
- 최신 운영 이미지는 `release-20261014-6dab388`다. 당시 코드·콘텐츠와 검증 근거는 `OPERATIONS.md`에 기록한다.

### 3. GitHub Actions·Argo CD 자동 게시 — 보류

- 사용자의 수동 commit 뒤 자동 push를 구성한다. iCloud 파일 동기화는 별도로 유지한다.
- GitHub 제공 runner에서 빌드·이미지 생성·GHCR 등록·배포 선언 갱신 후 홈 서버 Argo CD가 자동 Sync한다.
- 별도 Argo CD 설치 작업이 끝난 뒤 진행한다. 현재 작업에서 설치·운영 변경은 하지 않는다.

### 4. 표시·작성 개선 — 운영 반영

- Mermaid 정상 크기 표시, 커버 위치 자동값, 본문 사진·Mermaid 확대 팝업을 구현했다.
- Obsidian 카드 갤러리는 선택한 그림을 우선하고 미선택 시 본문의 첫 사진·Mermaid·YouTube·X 이미지를 사용한다.
- 코드 `542c11d`와 작성 설정 `d16269b`까지 GitHub에 게시했다. 2026-10-14 운영에 반영했다.

### 5. OG 메타데이터·방문 통계 — 구현 완료, 운영 실수신 보류

- 글별 제목·설명·대표 이미지·절대 URL의 OG를 제공한다. RSS·sitemap은 추가하지 않는다.
- 기존 GA4 계정·속성·스트림과 `G-YWPHXJFYET`를 확인하고 운영 hostname 두 곳에만 연결했다. localhost·blog.anyflow.net은 측정하지 않으며 중복 초기화를 차단한다.
- 새 코드의 실제 GA 수신과 UA 시절 통계의 export 백업 유무는 후속 확인 대상으로 남긴다.

### 6. 댓글·Like와 과거 데이터 이관 — 운영 반영, Git 연결 안정화 대기

- 직접 구현한 UI·수신 API·쿠키 권한과 비공개 `anyflow/blog-comments` Git 저장소를 사용한다. 신규 댓글·답글은 댓글 전용 Actions의 PR·승인·공개 JSON 생성을 거친다. 이 Actions는 3단계 블로그 전체 자동 배포와 별개다.
- 댓글 198개와 Like 95개 대상의 집계를 이관하고 운영 Git과 분리한 preview Git에 넣었다. 공개 대조가 끝난 본문 백업 44블록을 제거하고 원본 XML·OCR·텍스트·이미지 46개를 비공개 보관한다.
- Cassandra 1블록의 잘린 날짜는 확인 대상으로 유지한다. API 이미지 release-20261014-6dab388과 별도 Secret·Service·Deployment를 운영에 연결했다. 실제 신규 PR·관리자 승인·메일 수신은 후속 확인 대상이다. GitHub SSH의 간헐적인 초기 연결 종료로 실제 댓글·Like 저장 확인은 미완료다. API Pod Ready를 기능 완료로 간주하지 않는다.

### 7. 최종 UUID 주소 정리·전수 검증 1회와 운영 전환 — 대기

- 보류 중인 3단계를 포함한 모든 구현 TODO 완료 후 UUID 주소로 발행된 글을 일반 permalink로 일괄 변경한다. 내부 링크·댓글 주소 대응과 OG를 함께 갱신하며 고정 글 ID는 유지한다. UUID 별도 주소·redirect는 만들지 않는다.
- 이후 전체 콘텐츠·원본 구조·본문·링크·첨부·이미지·공개 URL·화면 조합과 기능 간 연결을 최종에서 한 번만 검증한다. 발견한 문제는 수정한 부분만 재확인한다.
- 최종 확인과 별도 승인 후 anyflow.net으로 전환한다. 그전에는 기존 호스팅·DNS·라우팅을 유지한다.
