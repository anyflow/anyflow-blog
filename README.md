# anyflow-blog

Obsidian의 `anyflow/blog` 콘텐츠를 Eleventy로 생성하고 홈 서버에서 제공하는 정적 블로그다.

## 개발

작업 원본은 alpine의 `/home/anyflow/workspace/my-cluster/apps/anyflow-blog`다.

```sh
npm ci
make sync
npm test
BLOG_OUTPUT_DIR=_preview npm run build
python3 -m http.server 18765 --bind 127.0.0.1 --directory _preview
```

`npm run dev`는 미리보기 빌드와 위 서버 실행을 함께 수행한다. 코드 수정 후 빌드를 다시 실행한다. Mac에서 SSH 터널로 접근하는 현재 미리보기 주소는 `http://127.0.0.1:8765/`다.

## 구성

- `.cache/blog/`: 비공개 `git@github.com:anyflow/blog.git`의 콘텐츠 작업 사본
- `lib/content.js`: 공개 대상 선별, Markdown·링크·첨부 변환, 목차·날짜 생성
- `src/`: 홈·상세 템플릿, CSS·JS, 원본 커버와 대표 화면 메타데이터
- `scripts/build.js`: 별도 경로에서 빌드하고 성공한 결과를 `_site` 또는 `_preview`로 전환
- `tests/content.test.js`: 공개 필터, 경로 변환, URL 검증, 작성자 속성 우선순위, 파일 경계 검증
- `deployment/`: nginx와 Kubernetes 배포 자산

브라우저의 Mermaid와 코드 하이라이트 라이브러리도 로컬 정적 자산으로 제공한다. 버전과 라이선스는 `src/js/vendor/README.txt`에 기록한다.

## 현재 검증 범위

홈, Istio 설치 글, 프라이베르크·포츠담 여행기를 대표 화면으로 사용한다. 전체 입력에서 394개 글과 참조 첨부 886개를 빌드하며, 전체 콘텐츠의 시각 검수와 누락 글 이관은 후속 작업이다. 기존 미해결 참조 7개는 별도로 정리한다.

커버 98개와 이모지 이미지 172개를 콘텐츠 저장소의 `_assets/visuals/`에 보관한다. 글 394개와 홈의 `cover`, `cover_x`, `cover_y`, `icon`으로 표시하며 원본 컬렉션의 전체 페이지 ID 398개를 대조했다. 최신 글 3개는 자산만 확보했다. 현재 콘텐츠는 5a9e126이며 깨끗한 clone으로 재현한다.

GitHub Actions·Obsidian 자동 push·운영 도메인 전환은 후속 단계다. blog.anyflow.net 배포와 실제 HTTPS 검증을 완료했다. 기존 anyflow.net은 유지한다. 코드는 비공개 anyflow/anyflow-blog에 게시한다. 배포 검증 상태는 OPERATIONS.md에 기록한다.

## 문서

- `GOAL.md`: 최종 목표와 완성 기준
- `PLAN.md`: 작업 단계와 완료 범위
- `ARCHITECTURE.md`: 시스템 경계와 데이터 흐름
- `CONTENT_CONTRACT.md`: 콘텐츠·라우팅·산출물 계약
- `OPERATIONS.md`: 빌드·검증·배포 절차
- `AGENTS.md`: 원격 작업과 인수인계 기준
