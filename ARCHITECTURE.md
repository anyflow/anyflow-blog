# Architecture

## Introduction

정적 콘텐츠 생성, 댓글 데이터 처리, 배포를 각각 독립된 흐름으로 구성한다. 사이트 코드는 이 저장소, 작성 원본과 댓글 원본은 별도 Git 저장소에서 관리한다.

## Summary

GitHub 제공 runner에서 산출물을 생성하고, Kubernetes는 완성된 이미지와 배포 선언을 가져와 실행한다. 다음 그림은 애플리케이션 단위의 논리 배포 뷰다.

```mermaid
---
config:
  theme: base
  htmlLabels: false
  flowchart:
    htmlLabels: false
  themeVariables:
    darkMode: false
    textColor: "#0f172a"
    primaryTextColor: "#0f172a"
    secondaryTextColor: "#0f172a"
    tertiaryTextColor: "#0f172a"
    lineColor: "#64748b"
    edgeLabelBackground: "#ffffff"
---
flowchart TB
    Admin["`**주인장 · 관리자**`"]
    Commenter["`**댓글 게시자**
브라우저`"]

    subgraph GitHub["GitHub"]
        Blog["`**blog repo**
Markdown·첨부`"]
        Code["`**anyflow-blog repo**
코드·Makefile·배포 YAML`"]
        Comments["`**comments repo**
비공개 · 댓글·Like·공개 데이터`"]

        subgraph Actions["GitHub Actions · GitHub 제공 runner"]
            Build["`**빌드 workflow**
정적 콘텐츠·컨테이너 이미지 생성`"]
            Publish["`**댓글 게시 workflow**
PR·승인·공개 데이터 생성`"]
        end

        GHCR["`**GHCR**
웹·댓글 API·배포 도구 이미지`"]
    end

    subgraph Home["홈 서버 · Kubernetes"]
        Cron["`**배포 CronJob**
1분 주기
emptyDir에 clone → make deploy`"]
        Gateway["`**public-gateway**
agentgateway
블로그 HTTPRoute·요청 제한`"]
        Web["`**nginx**
웹 Deployment · Service:80
정적 콘텐츠가 포함된 이미지`"]
        API["`**댓글 Deployment**
Node.js:3000 · Service:80
API·단일 비동기 처리기`"]
        PVC[("`**댓글 PVC**
영속 큐·로컬 Git checkout`")]
    end

    Admin -->|"D1a. 글 push"| Blog
    Admin -->|"D1b. 코드·설정 push"| Code
    Blog -->|"D2a. workflow_dispatch·콘텐츠 checkout"| Build
    Code -->|"D2b. 코드·workflow checkout"| Build
    Build -->|"D3. 이미지 push"| GHCR
    Build -->|"D4. 이미지 digest로 YAML 갱신·push"| Code
    GHCR -->|"D5. 배포 도구 이미지 준비"| Cron
    Code -->|"D6. 매 실행 새 clone"| Cron
    Cron -->|"D7a. 웹 Service·Deployment 적용"| Web
    Cron -->|"D7b. 댓글 Service·Deployment 적용"| API
    Cron -->|"D7c. HTTPRoute·요청 제한 정책 적용"| Gateway
    GHCR -->|"D8a. 웹 이미지 pull"| Web
    GHCR -->|"D8b. API 이미지 pull"| API

    Commenter -.->|"C1. 페이지·댓글·Like 요청"| Gateway
    Gateway -.->|"C2a. 일반 경로 → Service:80"| Web
    Gateway -.->|"C2b. /api → Service:80"| API
    API -->|"C3. 영속 큐 저장·접수 완료"| PVC
    API -.->|"C4. 비동기 Git push"| Comments
    Comments -->|"C5. push로 workflow 실행"| Publish
    Publish -->|"C6. PR·merge·공개 데이터 commit"| Comments
    Comments -.->|"C7. Git pull·조회 상태 갱신"| API

    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef repo fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef action fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    classDef registry fill:#cffafe,stroke:#0891b2,color:#164e63
    classDef service fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef gateway fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef storage fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    class Admin,Commenter actor
    class Blog,Code,Comments repo
    class Build,Publish,Cron action
    class GHCR registry
    class Web,API service
    class Gateway gateway
    class PVC storage
    style GitHub fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    style Actions fill:#faf5ff,stroke:#a78bfa,color:#4c1d95
    style Home fill:#f0fdf4,stroke:#86b996,color:#14532d
```

| 컴포넌트 | 역할 |
| --- | --- |
| 주인장 · 관리자 | 글·코드·설정을 작성하고 push하며 댓글 승인·관리를 수행한다. |
| 댓글 게시자 | 브라우저에서 페이지를 조회하고 댓글·답글·Like와 본인 댓글 수정·삭제를 요청한다. |
| blog repo | 작성 Markdown과 첨부를 보관하고 콘텐츠 변경 시 빌드 workflow를 호출한다. |
| anyflow-blog repo | 코드·템플릿·Makefile·workflow와 이미지 digest가 기록된 배포 YAML을 보관한다. |
| comments repo | 댓글·Like·작성 권한 데이터와 댓글 게시 workflow를 비공개로 보관한다. |
| 빌드 workflow | GitHub 제공 runner에서 입력을 검증하고 정적 콘텐츠·이미지를 생성해 GHCR과 배포 YAML에 게시한다. |
| 댓글 게시 workflow | GitHub 제공 runner에서 신규 댓글 PR·승인 절차와 공개 데이터 생성을 수행한다. |
| GHCR | 웹·댓글 API·배포 도구 이미지를 digest별로 보관한다. |
| 배포 CronJob | 매분 emptyDir에 코드를 clone하고 make deploy로 Service·Deployment·라우팅·정책을 적용한다. |
| public-gateway | HTTPS를 수신하고 HTTPRoute로 정적 콘텐츠와 API를 분기하며 요청 제한을 적용한다. |
| nginx | 이미지에 포함된 HTML·CSS·JS·미디어·검색 색인을 제공하고 정규 URL 리다이렉트를 처리한다. |
| 댓글 Deployment | 입력·인증·권한 검증, 로컬 상태 조회, 영속 큐 접수와 단일 비동기 처리기의 Git 저장을 수행한다. |
| 댓글 PVC | API 재시작에도 필요한 작업 큐·처리 기록·댓글 Git checkout을 보존한다. |

D는 배포, C는 페이지 조회·댓글 처리 순서이며 a/b/c는 같은 단계의 분기다. 리소스 적용과 이미지 다운로드는 일부 병렬로 진행한다. C3의 영속 저장을 마친 뒤 접수를 응답한다. C6의 PR 절차는 신규 댓글·답글에 적용하며 Like·기존 공개 댓글 수정·삭제는 main에 직접 저장한다.

waypoint·ztunnel·응답 경로·Secret 등 세부 인프라는 그림에서 생략한다. 현재 실제 웹/API 연결은 메시 설정에 따라 Istio waypoint를 경유하며, HTTPRoute에는 각 Service만 지정한다.

## 기술 선택 이유

각 기술은 정적 블로그와 낮은 요청량의 댓글을 운영하는 데 필요한 실행 환경과 관리 대상을 줄이기 위해 선택한다.

| 기술 | 선택 이유 |
| --- | --- |
| Eleventy·Nunjucks | 데이터와 템플릿으로 페이지 구조를 제어하고 HTML을 빌드하므로 서버 측 페이지 실행 환경을 운영하지 않는다. |
| Pagefind | 생성 HTML로 색인을 만들고 브라우저에서 검색하므로 별도 검색 서버·DB를 운영하지 않는다. |
| Markdown-it·KaTeX·Mermaid | Markdown 원본에 표현을 보존하면서 수식은 빌드 시, 다이어그램은 브라우저에서 테마에 맞게 처리한다. |
| nginx | 정적 산출물과 HTTP 제공 설정을 같은 이미지로 고정해 교체·복구 단위를 일치시킨다. |
| agentgateway | 공통 Gateway와 블로그 소유 HTTPRoute·정책의 설정 책임을 분리한다. |
| GitHub Actions·GHCR | 홈 서버의 빌드 부하를 줄이고 코드·콘텐츠 조합의 산출물을 이미지 digest로 배포한다. |
| Kubernetes CronJob·Makefile | 배포 수신 API·상시 배포 서버 없이 Kubernetes와 make 명령으로 주기적 적용을 수행한다. |
| Node.js·Git·PVC | 낮은 요청량에서 별도 SQL·Redis를 운영하지 않고 영속 접수와 Git 변경 이력을 확보한다. |

## 빌드와 배포 보장

D 단계는 검증을 통과한 산출물을 게시하고, 배포 실패는 다음 정기 실행에서 재시도한다.

- 게시 속성·Markdown·내부 링크·참조 첨부를 검증한다. 작성 규칙과 공개 범위는 [CONTENT_CONTRACT.md](CONTENT_CONTRACT.md)를 따른다.
- 링크 메타데이터·X 사진·Mermaid 등의 카드/OG 이미지는 수집 결과를 캐시해 재사용한다.
- HTML·검색 색인·sitemap·공개 글 카탈로그를 임시 경로에서 완성한 뒤 `_site` 또는 `_preview`를 교체한다. 직전 결과는 `.cache/previous-build`에 한 개 보관한다.
- 빌드 중 코드 또는 콘텐츠 SHA가 바뀌면 오래된 배포 선언의 게시를 생략한다.

CronJob은 `concurrencyPolicy: Forbid`로 정기 작업의 중복 실행을 막는다. 매 실행마다 master 브랜치를 depth 1로 clone하고 작업 종료 시 checkout을 정리한다. emptyDir은 Pod와 함께 제거하며 배포 PVC·파일 잠금·마지막 성공 기록은 사용하지 않는다. 동일한 이미지 digest의 YAML을 재적용해도 웹/API Pod는 교체하지 않는다.

웹·댓글 API·배포 도구 이미지는 독립된 digest를 사용하므로 사이트 변경만 배포할 때 댓글 API를 교체하지 않는다. 이미지 선언과 적용 명령은 [Makefile](Makefile), [배포 스크립트](scripts/poll-deploy.sh), [빌드 workflow](.github/workflows/publish.yml)를 따른다.

## 댓글·Like 처리

방문자의 요청은 PVC에 저장한 뒤 접수를 응답하고 Git 저장은 같은 API 프로세스의 비동기 처리기가 순서대로 수행한다.

```mermaid
---
config:
  theme: base
  htmlLabels: false
  flowchart:
    htmlLabels: false
  themeVariables:
    darkMode: false
    textColor: "#0f172a"
    primaryTextColor: "#0f172a"
    lineColor: "#64748b"
    edgeLabelBackground: "#ffffff"
---
flowchart TB
    Visitor["`**댓글 게시자**
브라우저 · 즉시 화면 반영`"]
    Admin["`**주인장 · 관리자**
로그인·승인·댓글 관리`"]
    Gateway["`**public-gateway**
agentgateway · 요청 제한
/api → 댓글 Service:80`"]

    subgraph Pod["댓글 Deployment · 1 Pod · 하나의 Node.js 프로세스"]
        HTTP["`**HTTP API**
Pod:3000
입력·Origin·쿠키·권한 검증
권한별 응답 생성`"]
        Queue["`**작업·상태 관리**
QueueStore
중복·Like 순서·댓글 버전 검사
기준 상태 + 대기 작업`"]
        Worker["`**단일 비동기 처리기**
QueueStore.drain
작업을 배치로 인출·순서대로 적용`"]
        Git["`**Git 저장기**
GitStore
fetch·commit·push`"]
    end

    subgraph PVC["댓글 PVC · Pod 재시작 후에도 유지"]
        QueueFile[("`**영속 큐 파일**
queue.json
기준 상태·대기 작업·처리 기록`")]
        Checkout[("`**로컬 Git checkout**
댓글 저장소 작업 사본`")]
    end

    subgraph GitHub["GitHub"]
        subgraph Repo["comments repo · 비공개"]
            Incoming["`**incoming 브랜치**
신규 댓글·답글
대기 댓글 수정·삭제`"]
            Main["`**main 브랜치**
게시된 댓글·Like·설정
공개 데이터`"]
        end
        Publish["`**댓글 게시 workflow**
GitHub 제공 runner
PR 생성·승인 확인·공개 데이터 생성`"]
    end

    Visitor <-->|"1a. 댓글·Like·조회 요청과 응답"| Gateway
    Admin <-->|"1b. 관리자 요청과 응답"| Gateway
    Gateway <-->|"2. Service:80 → Pod:3000"| HTTP

    HTTP -->|"W3. 변경 작업 접수"| Queue
    Queue -->|"W4. 임시 파일 기록·fsync·원자적 교체"| QueueFile
    Queue -->|"W5. 영속 저장 후 접수 결과 반환"| HTTP
    Queue -->|"W6. 작업 접수·오래된 조회 상태의 갱신 알림"| Worker
    Worker -->|"W7. Git 트랜잭션·동기화"| Git
    Git ---|"W8. 로컬 Git 작업"| Checkout
    Git -->|"W9a. 신규·대기 댓글 push"| Incoming
    Git -->|"W9b. 공개 댓글 수정·삭제·Like push"| Main

    Incoming -->|"G1a. push로 실행"| Publish
    Main -->|"G1b. push로 실행"| Publish
    Publish -->|"G2. PR·merge·공개 데이터 commit"| Main

    Repo -->|"S1. main·incoming 백그라운드 fetch"| Git
    Git -->|"S2. 최신 저장 상태 반환"| Worker
    Worker -->|"S3. 기준 상태·완료/실패 기록 갱신"| Queue
    Worker -->|"S4. Git 일시 실패 시 재시도"| Worker
    QueueFile -.->|"B1. 재시작 시 복원·미처리 작업 재개"| Queue

    HTTP -->|"R3. 댓글·작업 상태 조회"| Queue
    Queue -->|"R4. 기준 상태에 대기 작업을 적용해 반환"| HTTP

    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef gateway fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef process fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef worker fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    classDef storage fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef repo fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    class Visitor,Admin actor
    class Gateway gateway
    class HTTP,Queue process
    class Worker,Git,Publish worker
    class QueueFile,Checkout storage
    class Incoming,Main repo
    style Pod fill:#f0fdf4,stroke:#86b996,color:#0f172a
    style PVC fill:#fff7ed,stroke:#ea580c,color:#0f172a
    style GitHub fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    style Repo fill:#eff6ff,stroke:#60a5fa,color:#0f172a
```

| 컴포넌트 | 역할 |
| --- | --- |
| 댓글 게시자 | 브라우저에서 댓글·답글·Like를 요청하고 화면에 즉시 반영하며 접수·처리 상태를 확인한다. |
| 주인장 · 관리자 | 관리자 인증 후 댓글·승인 설정을 관리한다. |
| public-gateway | 요청 제한과 HTTPRoute를 적용해 /api 요청을 댓글 Service로 전달한다. |
| HTTP API | 입력·Origin·쿠키·권한을 검증하고 변경 접수·조회 응답을 제공한다. |
| 작업·상태 관리 | 중복 요청·Like 순서·댓글 버전을 검사하고 기준 상태와 대기 작업을 결합한다. |
| 단일 비동기 처리기 | 같은 Node.js 프로세스에서 작업을 순서대로 적용하고 Git 동기화·재시도를 수행한다. |
| Git 저장기 | 로컬 checkout에서 fetch·commit·push를 수행한다. |
| 영속 큐 파일 | 댓글 PVC에 기준 상태·대기 작업·처리 기록을 저장하며 재시작 시 미처리 작업을 복원한다. |
| 로컬 Git checkout | 댓글 PVC에 댓글 저장소의 작업 사본을 유지한다. |
| incoming 브랜치 | 신규 댓글·답글과 대기 댓글 변경을 PR 게시 전까지 보관한다. |
| main 브랜치 | 게시된 댓글·Like·설정과 생성된 공개 데이터를 보관한다. |
| 댓글 게시 workflow | 신규 댓글 PR 생성·승인 확인·merge와 공개 데이터 생성을 수행한다. |

W는 변경 접수·저장, G는 GitHub 게시, S는 백그라운드 동기화, R은 조회, B는 재시작 복원 순서다. W5는 PVC 저장 완료를 뜻하며 Git 저장·공개 완료를 뜻하지 않는다. 작업 완료 기록도 Git 반영 완료를 나타내며 신규 댓글 공개는 PR 게시 절차를 따른다.

> [!WARNING]
> **댓글 서비스는 단일 Pod·단일 writer 전용이며 HPA를 지원하지 않는다.** 현재 처리량이 미미하고 높은 가용성 요구가 없으므로 API와 비동기 처리기를 한 Pod에 두고, PVC 한 개·`replicas: 1`·`Recreate`로 운영한다. 재시작·배포 중에는 일시적으로 댓글 API가 중단될 수 있다.
>
> 요청 직렬화와 worker 실행 제어는 프로세스 내부에만 존재한다. 여러 Pod가 같은 `queue.json`을 전체 덮어쓰면 작업 유실·중복 처리와 Git checkout 경합이 발생할 수 있다. `ReadWriteOnce`는 Pod 간 잠금이 아니며 `Recreate`도 HPA의 replica 증가를 막지 않는다.
>
> HPA 도입 시 여러 API Pod가 안전하게 접수·조회할 공유 영속 작업 저장소와 공통 상태를 마련하고, Git 저장은 별도 Deployment의 단일 worker가 수행하도록 분리해야 한다. worker 배포 중에도 중복 실행을 막아야 한다. worker만 분리하거나 PVC를 공유하는 것으로는 해결되지 않는다.

- 브라우저는 작성·수정·삭제·Like 상태를 먼저 표시하고 접수·실패 상태를 안내한다. 실패한 초안과 재시도 식별자를 유지한다.
- API는 입력·글 카탈로그·Origin·쿠키 권한을 검증한다. 이름·이메일·홈페이지 자체는 작성 권한 증명이 아니다.
- `request_id`로 재접수를 구분하고 Like의 `client_id`·`sequence`로 연속 요청의 순서를 보존한다. 댓글 수정·삭제는 버전 충돌을 검사한다.
- 큐는 대기 100건·직렬화된 대기 요청 1MiB로 제한한다. 신규 초과 요청은 저장 전에 `503 queue_full`과 `Retry-After: 5`로 거절한다.
- 완료 기록과 비활성 Like 순서 키는 최대 7일·2,000개로 정리한다. 대기·재시도 작업과 작업이 사용하는 키는 보존한다.
- 조회는 로컬 상태와 접수한 변경을 반영한다. 백그라운드 Git 동기화로 외부 변경을 가져오며 읽기 요청마다 Git fetch를 기다리지 않는다.

신규 댓글·답글은 비공개 댓글 저장소의 `incoming/**` 브랜치와 PR을 거친다. 승인 기본값은 OFF이며 해당 댓글 Actions가 자동 게시한다. 승인을 켜면 관리자의 승인 절차를 따른다. Like·기존 공개 댓글 수정·삭제는 신규 댓글 PR 알림을 만들지 않는다.

PR은 승인 절차와 새 댓글 알림을 GitHub 기능으로 제공해 별도 구현을 줄이기 위해 사용한다. 승인 OFF에서도 PR 생성·자동 merge를 거쳐 알림을 제공하며, 승인 ON에서는 PR을 대기시켜 관리자가 검토한 뒤 공개한다. 이 선택은 자동 공개 시에도 브랜치·PR·merge 처리와 공개 지연을 수반한다. 데이터 보존과 변경 이력은 Git commit으로 확보하고 요청 순서·중복 제어는 큐와 worker가 담당하므로, 이 보장을 위해 PR이 필요한 것은 아니다.

댓글 저장소에 적용할 workflow와 게시 코드는 [integrations/comments-data/](integrations/comments-data/)에 있다. 이 코드와 `lib/comments/`의 관련 모듈을 함께 배포하고 실제 댓글 데이터는 보존한다.

## 인증과 공개 경계

서명 키·관리자 키·Git SSH 키는 실행 환경의 비공개 설정과 Kubernetes Secret으로 제공한다.

| 기능 | 권한 |
| --- | --- |
| 게시된 댓글 조회 | 익명 허용 |
| 댓글·답글·Like | 방문자 쿠키, 허용 Origin, 입력 검증 |
| 본인 댓글 수정·삭제 | 작성한 브라우저의 쿠키 |
| 전체 댓글 관리·승인 설정 | 관리자 인증 쿠키 |

방문자 쿠키는 1년, 관리자 쿠키는 7일을 사용한다. 쿠키를 잃으면 해당 브라우저의 작성 권한과 Like 식별도 잃는다. 관리자는 별도 브라우저에서도 인증 후 관리할 수 있다. 댓글 본문은 텍스트로 표시하고 HTTP/HTTPS/www 주소만 안전한 DOM 링크로 만든다.

Gateway의 로컬 요청 제한은 로그인·쓰기·조회에 접속 주소별 한도와 전체 한도를 함께 적용한다. 정책 값은 [agentgatewaypolicy.yaml](deployment/agentgatewaypolicy.yaml)을 따른다. 카운터는 프록시마다 독립적이며 재시작 시 초기화된다. NAT나 중간 프록시로 출발지 주소가 합쳐지면 사용자들이 주소 한도를 공유한다. 클라이언트가 제공한 `X-Forwarded-For`를 식별 키로 신뢰하지 않는다.

일반 방문자에게는 게시된 댓글·표시 작성자·Like 집계를 제공한다. 작성자와 관리자는 권한에 따라 대기 댓글과 작업 상태를 조회할 수 있다. 작성 권한 해시·요청 fingerprint·비공개 원본 설정은 공개 응답에 포함하지 않는다. `noindex`는 공개 접근 제어 수단이 아니다.

## 수평 확장 범위

nginx와 public-gateway는 댓글의 단일 writer 제약과 별개로 확장할 수 있으나 현재 두 Deployment에는 HPA를 설정하지 않는다.

| 대상 | 확장 시 고려 사항 |
| --- | --- |
| nginx | 동일 digest의 정적 파일을 제공하며 공유 쓰기 상태·PVC가 없어 replica를 늘릴 수 있다. HPA를 설정할 때 배포 YAML의 고정 replicas 재적용과 조정되지 않도록 해야 한다. |
| public-gateway | 여러 proxy replica로 HTTPRoute 트래픽을 처리할 수 있다. 현재 local rate limit 카운터는 Pod별로 독립적이므로 전체 허용량은 replica 수에 따라 늘어난다. 전체 고정 한도가 필요하면 공유 카운터를 사용하는 global rate limit이 필요하다. |
| 댓글 API·worker | 위 WARNING의 단일 writer 제약을 해소하기 전까지 1 Pod를 유지한다. |

공통 Gateway·Istio와 모든 replica는 같은 홈 서버에 있으므로 Pod 수 증가가 홈 서버 장애에 대한 가용성을 보장하지 않는다. [agentgateway 공식 문서](https://agentgateway.dev/docs/kubernetes/latest/documentation/security/rate-limit-http/)는 local rate limit을 “per proxy replica”로 정의한다.
