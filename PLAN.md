# PLAN

## 목표

anyflow.net public site를 자체 정적 블로그 시스템으로 대체한다.
1차 범위는 representative page subset으로 표면 재현 품질을 검증하고, 이 방향으로 갈 수 있는지 판단하는 것이다.

## 결정 사항

### 도구
- 11ty(Eleventy) 기반 정적 사이트 생성.
- CSS/JS는 자체 작성, 외부 CDN 의존 없음.
- 단일 컨테이너 이미지 (multi-stage Dockerfile: 11ty 빌드 + nginx 서빙).

### 1차 범위
- 대표 페이지 subset으로 표면 재현 검증.
- 전체 corpus 이관, GitHub Actions, Remark42 연동은 1차에 포함하지 않는다.

### 대표 페이지 선정 기준
- 표면 유형 기준 4종을 커버한다.
  - 홈페이지: 글 목록 피드, 카테고리 네비게이션, 프로필 영역
  - 글 상세 페이지 (텍스트 위주): 제목, 메타, 본문
  - 글 상세 페이지 (이미지 많은): 이미지/캡션 처리 확인
  - 카테고리 목록 페이지: 카테고리별 글 목록
- 대표 글 3~4개면 충분하다.

### 콘텐츠 수집
- 1차에서는 수동 수집한다.
- 자동 추출기는 전체 이관 단계에서 필요할 때 만든다.

### 프로젝트 구조
- manifest/, migration/ 등 중간 산출물 디렉토리를 두지 않는다.
- src/ (소스), _site/ (빌드 출력), deployment/ (k8s 매니페스트).

### URL 정책
- 정식 URL은 clean URL 기준.
- legacy UUID 경로는 이관 대상이 아니다. redirect도 만들지 않는다.

### 호스팅
- blog.anyflow.net으로 서빙. my-cluster에서 직접 서빙.
- Gateway API HTTPRoute + Let Encrypt TLS.

### 카테고리
- 정적 카테고리 페이지를 별도 생성한다 (홈 JS 필터링 아님).

## 구현 순서

### 1. 기준 사이트 표면 분석 [완료]
- anyflow.net의 레이아웃, CSS, 인터랙션 분석 완료.
- 단일 컬럼, max-width 708px, 시스템 폰트, 다크모드 토글, 카드 그리드 등 파악.

### 2. 11ty 프로젝트 세팅 + 대표 페이지 수집/변환 [완료]
- 11ty 프로젝트 초기화, 템플릿 구조, CSS/JS 작성 완료.
- 대표 글 2개 (AI Agents Platform, Zero Trust Architecture via Istio) Markdown 변환 완료.
- 컨테이너 이미지 빌드 및 blog.anyflow.net 배포 완료.

### 3. 표면 재현 [진행 중]
- 기본 레이아웃, 타이포그래피, 카드 그리드, 다크모드 구현 완료.
- 남은 작업:
  - 카테고리 목록 페이지
  - 기준 사이트와 나란히 비교하여 세부 스타일 조정
  - RSS, sitemap, search index

### 4. 검증 [미착수]
- 대표 페이지 4종을 기준 사이트와 나란히 비교.
- 내부 링크, 이미지 로드, 반응형, 다크모드, 검색, OG metadata.

## 후속 단계

1차 검증 통과 후:
- 전체 corpus 이관 (자동화 필요)
- GHCR push 자동화 (GitHub Actions + self-hosted runner)
- Remark42 연결
- production cutover
