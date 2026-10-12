# OPERATIONS

## 현재 단계

대표 UI와 콘텐츠 5a9e126을 blog.anyflow.net에 게시한다. 기존 anyflow.net의 호스팅·DNS·라우팅은 유지한다. 코드 저장소는 비공개 git@github.com:anyflow/anyflow-blog.git이다.

## 미리보기

```sh
make sync
npm test
BLOG_OUTPUT_DIR=_preview npm run build
sudo rc-service anyflow-blog-preview status
```

새 콘텐츠 원본은 비공개 `anyflow/blog` 저장소 루트다. 현재 Mac의 SSH 터널 미리보기는 `http://127.0.0.1:8765/`이며 운영 `blog.anyflow.net`과 분리한다. 빌드는 성공한 결과만 전환하고 이전 생성 결과 한 개를 `.cache/previous-build`에 보관한다.

## 빌드/배포

### 원샷 설치
    make anyflow-blog-c

수행 순서: cert-manager 확인 -> Gateway 적용 -> 인증서 발급 대기 -> docker build -> kind load -> deployment/service/httproute apply -> rollout wait

### 원샷 제거
    make anyflow-blog-d

### 기존 배포 갱신
    cd apps/anyflow-blog
    make load deploy

manifest의 고유 이미지 태그로 빌드·kind 적재 후 삭제 없이 rollout한다. root anyflow-blog-r은 삭제를 포함하므로 일반 배포에는 사용하지 않는다.

### 수동 빌드/배포 (개발 중)
    cd apps/anyflow-blog
    make load deploy

## 접근

- HTTPS: https://blog.anyflow.net/
- DNS: blog.anyflow.net -> anyflow.iptime.org -> 222.108.188.34
- TLS: Let Encrypt, cert-manager HTTP-01 challenge
- Gateway: public-gateway (cluster namespace), blog.anyflow.net listener
- HTTPRoute: anyflow-blog (service namespace)

## 검증

- 기준 사이트와 나란히 눈으로 비교
- 체크 항목: 내부 링크, 이미지 로드, 반응형, 다크모드, 검색, OG metadata

## 후속 단계

대표 화면 사용자 확인 후:
- 전체 콘텐츠 검수와 누락 글·링크 정리
- GitHub Actions와 self-hosted runner의 공유 볼륨 게시 구성
- Disqus 댓글·좋아요 보존 확인
- 전체 검증과 별도 승인 후 anyflow.net 전환

이 문서는 단계가 진행될 때마다 갱신한다.

## 현재 검증 제약

정적 빌드와 깨끗한 의존성 설치는 검증했다. 최신 이미지와 실제 배포 결과는 최종 검증 후 아래에 기록한다. 서버의 네트워크·DNS 설정은 변경하지 않는다.

## 시각 자산 미리보기

시각 자산과 글별 속성은 iCloud blog vault에 저장한다. 현재 `.cache/blog`에는 GitHub의 5a9e126을 깨끗하게 clone해서 사용한다. 시각 자산 270개와 작성 속성·갤러리 설정을 포함한다. 이전 작업 사본은 `.cache/blog-before-publish-20261012`에 보관한다. `_assets/visuals/manifest.json`에 모든 원본 페이지 ID와 주소를 보관하며 slug가 없는 글 8개도 UUID 주소로 대응했다.

## 미리보기 상시 실행

alpine의 OpenRC `anyflow-blog-preview`가 127.0.0.1:18765에서 `_preview`를 제공한다. 소스 설정은 `scripts/preview.openrc`, 설치 위치는 `/etc/init.d/anyflow-blog-preview`다. default runlevel에 등록하고 supervise-daemon으로 자동 재시작한다. 서비스 사용자 권한은 anyflow다.

Mac의 LaunchAgent `net.anyflow.blog-preview-tunnel`이 127.0.0.1:8765를 alpine의 127.0.0.1:18765로 연결한다. 사용자 로그인 시 자동 시작하며 SSH가 종료되면 자동 복구한다. 설정은 `~/Library/LaunchAgents/net.anyflow.blog-preview-tunnel.plist`, SSH 설정과 로그는 `~/Library/Application Support/anyflow-blog-preview/`에 둔다. 공개 Gateway·운영 블로그에는 적용하지 않는다.

```sh
# alpine
sudo rc-service anyflow-blog-preview status
sudo rc-service anyflow-blog-preview restart
# Mac
launchctl print gui/$(id -u)/net.anyflow.blog-preview-tunnel
```

검증에서 Python worker와 SSH 터널을 종료한 뒤 새 PID로 자동 복구되고 Mac 미리보기 HTTP 200이 돌아오는 것을 확인했다. 실제 호스트 재부팅 후 OpenRC 자동 시작과 Mac 미리보기 HTTP 200도 확인했다. 상시 서버 실행 중에는 `npm run dev`로 같은 포트를 추가 실행하지 않고 `BLOG_OUTPUT_DIR=_preview npm run build`만 수행한다.

Obsidian의 갤러리 선택은 글 속성과 편집기 표시를 갱신한다. 웹 미리보기는 콘텐츠 사본 반영과 재빌드가 필요하며, commit 이후 자동 게시 연결은 후속 단계다.

## 이미지 버전과 복구

현재 태그는 ghcr.io/anyflow/anyflow-blog:ui-20261012-5a9e126-r2이다. manifest의 태그를 Makefile에서 읽으며 이미지 label에 코드·콘텐츠 commit을 기록한다. GHCR 업로드 없이 kind에 적재한 이미지를 사용한다. 다음 릴리스에는 새 태그를 사용한다.

이전 latest 이미지와 Deployment 이력은 유지한다. 장애 시 kubectl -n service rollout undo deployment/anyflow-blog로 이전 이력을 복구하고 manifest도 대응 버전으로 되돌린다. 서버 재부팅 후 80·443 포워딩이 없어지면 루트 make port_forward로 기존 NodePort 경로를 복구한다. CSS·JS URL에는 파일 해시를 붙여 변경된 파일을 다시 읽도록 한다.

HTML과 첨부에 Cache-Control: no-cache를 반환해 브라우저가 변경 여부를 재검증하도록 한다. 기존 방문자의 이전 HTML 캐시는 한 번 새로고침하면 갱신된다.
