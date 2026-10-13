# 비공개 댓글 데이터

댓글·Like의 원본 저장소이며 공개 웹사이트 저장소와 분리한다. 저장소 공개 전환을 금지한다.

- settings.json: 승인 설정, 이전 Like 집계
- comments/<id>.json: 댓글 1개당 파일 1개. owner_hash 등 작성 권한 해시는 비공개
- likes/<대상 SHA256>.json: {target:"post:<id>" 또는 "comment:<id>",actors:{<해시>:true}}
- requests/<id>.json: 신규 댓글의 PR 알림용 제목·글 주소
- incoming/<id>: 검토 중인 댓글 브랜치. main에 merge하기 전 공개하지 않는다
- public/<postId>.json: 게시 댓글과 Like 집계만 포함. 비밀 키·해시·대기 댓글·설정은 제외
- originals/: 기존 댓글 이관의 원본. 공개 산출물에 포함하지 않는다

새 댓글·답글은 incoming 브랜치 push → Actions PR 생성 → 승인 설정 OFF면 자동 merge → 같은 Actions 실행에서 공개 파일 갱신한다. ON이면 PR을 검토하고 merge하거나 관리자 UI에서 승인한다. GitHub가 만든 merge는 새 workflow를 시작하지 않으므로 자동 merge 후 같은 실행에서 export를 수행한다. 수동 merge는 main push workflow가 export한다.

Like·기존 댓글 수정·삭제·일괄 이관은 main에 직접 기록하여 신규 PR 알림을 만들지 않는다. 대기 댓글의 수정·삭제는 해당 incoming 브랜치에서 처리한다.

GitHub 저장소 알림에서 Custom → Pull Requests만 선택한다. 계정의 이메일 알림 설정은 GitHub 사용자 설정을 따른다. Like와 이관은 PR을 만들지 않는다.

이 저장소의 실행 코드 원본은 alpine의 anyflow-blog/integrations/comments-data와 lib/comments/{export,model}.js다. 코드를 갱신할 때 데이터 파일과 원본은 보존한다. 별도 PAT나 서버 GitHub API token 없이 기존 서버 SSH Git 인증과 Actions GITHUB_TOKEN을 사용한다.
