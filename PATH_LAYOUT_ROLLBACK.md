# 파일 구조·댓글 ID 전환과 롤백

## Introduction

파일 경로를 공개 URL·댓글 글 식별자로 사용하는 전환의 실행·복원 절차다. 비공개 콘텐츠의 `_assets/_meta/path-migration.json`은 원본/대상 파일, 이전 ID/경로 ID, 제거한 속성과 Git 태그 대응을 보존한다. 별도 압축 백업은 만들지 않는다.

## Summary

전환·롤백 모두 댓글 쓰기·자동 배포·댓글 게시 Actions를 중지하고 큐를 비운 상태에서 수행한다. 정적 사이트·댓글 API·데이터·카탈로그가 같은 ID 체계가 된 뒤 쓰기를 재개한다. PVC·Secret을 삭제하거나 교체하지 않는다. 쿠키 서명 비밀키와 작성 권한은 유지한다.

## 복원 지점

- 소스·콘텐츠·댓글 main: 각 저장소의 `path-layout-20261017-before` 태그.
- 승인 대기 브랜치: 댓글 저장소의 `path-layout-20261017-before-incoming-<댓글ID>` 태그.
- 운영 전환 직전 변경이 있으면 `path-layout-20261017-cutover` 및 해당 incoming 태그를 추가하여 최신 상태를 고정한다.
- 이전 정적 이미지: `ghcr.io/anyflow/anyflow-blog@sha256:eea14871822bc3b30cc408998f7a49397a951cac3e711b1bded19492f1d5a229`.
- 이전 댓글 API: `ghcr.io/anyflow/anyflow-blog-comments@sha256:d2d6603bb828d56f00ca627161bb5717f6180f07c22294858b06142018cb8a23`.
- 배포 도구: `ghcr.io/anyflow/anyflow-blog-deploy@sha256:1bd87be35d4c0a7bc3f8db0b69290dd68b4d0b6d914a2bcc6315a85531bf35df`.
- 콘텐츠 및 댓글 역변환은 최신 이력 위에 새 commit으로 기록한다. force push·Git 이력 되감기·PVC 삭제는 사용하지 않는다.

## 변환 도구

아래 명령은 소스 저장소에서 실행한다. 댓글 변환 대상에는 main과 모든 incoming 브랜치가 포함된다. 각 브랜치 작업 사본에서 명령을 실행하고 export 코드도 해당 ID 형식에 맞춰 함께 반영한다.

```sh
node scripts/migrate-path-layout.js plan CONTENT_DIR PLAN.json
node scripts/migrate-path-layout.js content CONTENT_DIR PLAN.json
node scripts/migrate-path-layout.js comments COMMENTS_CHECKOUT PLAN.json
node scripts/migrate-path-layout.js queue /data/queue/queue.json PLAN.json
```

역변환은 동일 명령의 마지막에 `--reverse`를 붙인다. 큐는 API와 worker를 정지한 뒤 변환한다. 미처리 jobs가 남으면 변환 도구가 실패한다. 수신을 중지하고 QueueStore로 남은 작업을 Git에 반영한 후 다시 확인한다. 완료된 접수 기록·재시도 식별·Like 순서 기록은 유지하며 글 ID만 전환한다.

## 쓰기 재개 전 롤백

1. CronJob suspend와 댓글 게시 Actions 중지를 유지한다. 댓글 API는0 replicas로 유지하고 유지보수 Pod에서 데이터 작업을 수행한다.
2. main·incoming 및 큐를 `--reverse`로 변환한다. 댓글 본문·답글·권한·Like actor가 전환 전 모델과 일치함을 확인한다.
3. 콘텐츠도 `--reverse`로 변환한다. 기존 위치·필수 속성을 복원하고 미디어 참조를 대조한다.
4. 댓글 저장소의 `lib/comments` 게시 코드와 소스·배포 설정은 전환 전 태그에서 가져와 복원 commit을 만든다. 새 변환 도구는 역변환을 마칠 때까지 유지한다.
5. 전환 전 정적·API 이미지 digest를 배포 YAML에 복원하고 rollout한다. 큐·PVC·Secret은 유지한다.
6. 글·첨부·댓글·Like를 확인하고 API replicas1·댓글 Actions·CronJob을 재개한다. 새 ID로 열린 브라우저는 새로고침한다.

## 쓰기 재개 후 롤백

최신 Git 데이터에서 역변환하여 전환 이후의 댓글 작성·수정·삭제와 Like까지 보존한다. 과거 스냅샷만 복원하지 않는다.

1. 새 API의 `/data/maintenance` 파일로 쓰기를 차단한다. 자동 배포와 댓글 게시 Actions를 중지하고 큐가 비면 API를0 replicas로 내려 추가 접근을 막는다.
2. 최신 main·incoming commit을 별도 롤백 태그로 고정한다. 최신 콘텐츠 대응표로 댓글·Like·요청·큐를 역변환한다.
3. 전환 이후 새 글은 경로 SHA256 앞32자리의 이전 형식 ID를 사용한다. 콘텐츠 역변환 도구가 `<경로>/<파일명>.md` 위치와 permalink/post_id 속성을 생성하며 신규 미디어도 옮긴다.
4. 최신 콘텐츠·댓글의 수·본문·시각·답글·권한·Like를 보존했는지 확인한다. 신규 글·미디어가 있으면 역변환한 콘텐츠를 이전 생성기로 재빌드한다. 신규 글이 없으면 전환 전 정적 이미지를 사용한다.
5. 이전 API·게시 코드·배포 설정을 복원 commit으로 게시하고 데이터·이미지·카탈로그를 같이 배포한다. 읽기·쓰기 검증 후 차단 파일을 제거하고 자동 작업을 재개한다.

## 검증과 중단 기준

공개 URL 유지·자산 SHA·참조 누락0, 댓글/Like 데이터의 정방향→역방향 동등성, 대기 브랜치·큐 접수/순서 보존, 경로 ID의 작성·답글·수정·삭제·Like 시험을 통과해야 한다. 게시 내용 손실·미해결 참조·ID 누락·브랜치 충돌·큐 미처리가 발견되면 쓰기를 재개하지 않는다.
