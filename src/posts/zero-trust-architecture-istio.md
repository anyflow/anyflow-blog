---
title: "Zero Trust Architecture via Istio"
permalink: /sw-engineer/zero-trust-architecture-istio/
created: 2025-12-13
summary: "ZTA 원칙과 NIST SP 800-207 구조를 Kubernetes/Istio 환경에서 구현하는 방법"
tags:
  - ZTA
  - Zero Trust Architecture
  - Istio
  - OPA
  - NIST
  - NIST SP 800-207
  - Kubernetes
category: "as S/W 엔지니어"
kind: post
slug: zero-trust-architecture-istio
hero_image: /images/covers/met_william_morris_1875.jpg
toc: true
---

## Introduction

사내 보안 전문가 과정 중 작성한 발표 자료의 일부로서, Zero Trust Architecture(ZTA) 및 Kubernetes 환경에서의 ZTA 관점에서 바라본 Istio에 관한 정리이다. 참고로 NIST SP 800-207은 미국 국립표준기술연구소가 작성한 Zero Trust Architecture의 공식 표준 문서로서, 이를 가장 많이 참조하였다.

## Zero Trust Architecture란

ZTA는 "절대 신뢰하지 않고, 항상 검증한다(Never trust, always verify)"는 원칙에 기반한 새로운 보안 패러다임이다. 기존의 **경계 기반(Perimeter based) 보안 모델**이 내부 네트워크를 신뢰하는 것과 달리, ZTA는 위치에 관계없이 모든 사용자, 장치, 그리고 서비스와 트래픽을 잠재적 위협으로 간주하고, 매 순간 인증 및 권한 확인 절차를 거치도록 요구한다.

**경계 보안 모델이 침입을 막는 것에 집중했다면, ZTA는 침입을 가정하고 확산을 막는 것에 집중한다.**

| 구분 | 경계 기반 보안 모델 | ZTA |
|------|------------------|-----|
| 신뢰 기준 | 내부 네트워크 위치 | 사용자, 디바이스, 서비스 각각의 신원 검증 |
| 보안 범위 | 네트워크 경계 중심 | 데이터, 서비스, 워크로드 등 개별 리소스 중심 |
| 접근 제어 | 경계 지점에서의 일회성 인증 | 내/외부 무관, 매 요청마다 검증 및 최소 권한 부여 |
| 위협 대응 | 외부 침입 차단에 집중 | 내부 침투 가정, 측면 이동 차단 |

### ZTA 부각과 현황

2009년 Operation Aurora 해킹, 2015년 OPM 해킹, 2020년 SolarWinds 공급망 공격 등은 기존 경계 기반 모델의 한계를 보여줌과 동시에 ZTA의 요구를 부각시킨 사례로, 이들 모두 공통적으로 측면 이동(lateral movement)을 사용했다.

이후 미국에서는 연방정부 차원의 행정명령을 통해 ZTA는 필수가 되었고, NIST SP 800-207 표준 문서를 발표하였으며, CISA는 Zero Trust Maturity Model 2.0을 제정하였다.

> 💡 **Kubernetes의 보안 취약점**
>
> - **평문 통신:** 기본적으로 파드 간 통신은 암호화되지 않은 평문으로 이루어진다.
> - **신원 검증 부재:** 파드는 서로의 신원을 검증하지 않는다.
> - **애플리케이션 계층(L7) 수준 제어 불가:** Kubernetes NetworkPolicy는 IP 주소와 포트 기반 제어만 제공한다.

## Zero Trust Architecture의 원칙과 구조

### Tenets of Zero Trust (원칙)

1. **모든 데이터 소스와 컴퓨팅 서비스는 리소스**
2. **네트워크 위치와 무관하게 모든 통신 보호**
3. **리소스에 대한 접근은 세션별로 부여**
4. **리소스 접근은 동적 정책에 의해 결정**
5. **모든 자산의 무결성과 보안 태세를 모니터링하고 측정**
6. **모든 리소스 인증과 인가는 동적이며, 접근 전에 엄격하게 집행**
7. **자산과 통신의 현재 상태에 대해 가능한 한 많은 정보를 수집하고 개선에 활용**

### Logical Components of Zero Trust Architecture

![ZTA의 논리적 구성 요소. 출처: NIST SP 800-207](/images/posts/zta/nist-zta-components.png)

#### 핵심 구성요소(Core Components)

- **정책 결정 지점 (Policy Decision Point, PDP)**
  - **정책 엔진 (PE):** 신원 정보, 정책 규칙, 환경 컨텍스트를 종합 분석하여 접근 허용/거부 결정
  - **정책 관리자 (PA):** PE의 결정을 PEP에 전달하고 세션을 관리

- **정책 집행 지점 (Policy Enforcement Point, PEP)**
  - PDP의 결정을 실제로 집행하는 게이트키퍼

#### 관련 데이터 소스 (PIPs)

- **ID Management System:** 사용자, 디바이스, 서비스의 신원 관리
- **Activity Logs:** 과거 접근 기록, 행동 패턴
- **CDM System:** 자산 상태, 취약점, 패치 수준
- **Threat Intelligence:** 실시간 위협 정보
- **SIEM System:** 중앙화된 로그 분석, 이상 탐지

## Istio를 통한 ZTA 구현

Istio는 NIST SP 800-207의 micro-segmentation 접근 방식에 해당한다.

![NIST SP 800-207 Zero Trust Architecture과 Istio / OPA와의 관계](/images/posts/zta/istio-zta-mapping.png)

### Istio의 보안 features

1. **모든 통신의 암호화 (mTLS):** 클러스터 내 모든 서비스 간 통신에 상호 TLS를 적용
2. **강력한 신원 관리 (SPIFFE/SVID):** 각 서비스에 고유한 SPIFFE ID 부여
3. **세밀한 접근 제어 (AuthorizationPolicy):** L7 수준의 접근 제어
4. **동적 정책 관리:** Istiod가 모든 프록시에 정책을 동적으로 배포
5. **가시성 및 관찰성:** 모든 서비스 간 통신에 대한 로그, 메트릭, 분산 추적 수집
6. **보안 정책의 투명한 적용:** 애플리케이션 코드 수정 없이 보안 정책 적용

### Istio 구성 요소와 NIST SP 800-207 매핑

| NIST ZTA 구성요소 | Istio / OPA | 역할 |
|-----|-----|------|
| PDP - Policy Engine | OPA | 정책 결정 |
| PDP - Policy Administrator | Istiod | 정책 관리 |
| PEP | istio-proxy / Waypoint | 정책 수행 |
| PKI, ID Management | Istiod (SPIFFE, Citadel) | 신원 관리 |
| Activity Logs | Istio Access Log | 감사 로그 |
