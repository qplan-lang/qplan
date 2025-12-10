# qplan Roadmap

이 문서는 qplan의 단기·중기·장기 개발 방향을 제시하는 공식 로드맵입니다.  
버전은 Semantic Versioning을 기준으로 구성됩니다.

---

# 🌱 0.1.x — MVP (Minimum Viable Product)

### 🎯 목표  
기본적인 DSL → 파싱 → 실행까지 가능한 **최소 엔진 완성**.

### 📌 포함 기능
- [ ] Tokenizer (기본 토큰 분리)
- [ ] Parser (EBNF 기반 AST 생성)
- [ ] AST Node 정의 (Fetch, Calc, AI, If, Parallel 등)
- [ ] ExecutionContext / ModuleRegistry
- [ ] Basic Executor (순차 실행)
- [ ] FETCH / CALC / AI / CALL 기본 모듈
- [ ] 최초 end-to-end 실행 성공  
- [ ] DSL 기본 에러 메시지 체계

### 🚫 제외
- 병렬 안정화  
- 고급 조건문  
- HTTP/DB 모듈  
- 플러그인 시스템  

---

# 🌿 0.2.x — Core Language Stabilization

### 🎯 목표  
언어 안정화 및 병렬/조건 처리 고도화.

### 📌 기능
- [ ] PARALLEL 구현 (ExecutorService 기반)
- [ ] IF/ELSE 블록 안정화
- [ ] 모듈 입력 validation
- [ ] 에러 리포트 개선
- [ ] 기본 모듈 세트 확장
  - [ ] HTTP GET  
  - [ ] JSON 파싱  
  - [ ] FILE READ  

### ✨ 문서
- [ ] grammar.md 확정 버전
- [ ] examples.md 추가 확장

---

# 🌳 0.3.x — Extensibility & Plugin System

### 🎯 목표  
qplan을 확장 가능한 **플랫폼**으로 성장시키는 단계.

### 📌 기능
- [ ] Plugin Module System
- [ ] 외부 모듈 자동 로딩 (ServiceLoader 기반)
- [ ] Logging / Tracing 시스템
- [ ] Execution Graph 시각화 API
- [ ] qplan CLI 초기 버전
- [ ] 테스트 구조 확립

### ✨ 문서
- [ ] Plugin 개발 가이드 문서화

---

# 🌲 0.4.x — Developer Experience

### 🎯 목표  
qplan을 개발자 친화적인 도구로 개선.

### 📌 기능
- [ ] qplan Studio (GUI Builder) 프로토타입
- [ ] Syntax Highlighting (VSCode extension)
- [ ] Inline Documentation
- [ ] qplan 프로젝트 템플릿 생성기

### ✨ 문서
- [ ] UI/UX 가이드  
- [ ] Best Practices  

---

# 🌳 0.5.x — Distributed Execution

### 🎯 목표  
멀티 노드 실행 및 고신뢰 워크플로우 지원.

### 📌 기능
- [ ] qplan Distributed Runner
- [ ] Remote Module Execution
- [ ] Retry / Backoff 정책
- [ ] Workflow Checkpoint/Resume
- [ ] Long-running Execution 관리

---

# 🌲 0.6.x — Enterprise Features

### 🎯 목표  
기업용 기능 통합.

### 📌 기능
- [ ] 인증/권한 시스템 (API Key, JWT)
- [ ] RBAC 기반 모듈 실행 제한
- [ ] 중앙 로그 수집
- [ ] 사설 모듈 레지스트리
- [ ] SLA 기반 모듈 실행 정책

---

# 🌳 1.0.0 — Stable Release

### 🎯 목표  
qplan을 안정적이고 성숙한 프로덕션 워크플로우 엔진으로 완성.

### 📌 포함
- 완성된 문법
- 고급 모듈 생태계
- 분산 실행 엔진
- Cloud Runner
- GUI Studio
- 강력한 문서 세트
- 코드 퀄리티 & 테스트 커버리지 80%+

---

# 🛰 Long-term Vision (2.x+)

### qplan은 장기적으로 아래를 지향합니다:

- **AI Native Workflow Language 표준**  
- **qplan Cloud** (SaaS 형태의 실행 플랫폼)  
- **Marketplace** (모듈 공유/판매 생태계)  
- **자동화 전용 IDE**  
- **Enterprise-grade Observability**  
- **다중 언어 runtime (Rust, Go, Python)**  

---

# Version  
qplan Roadmap v1.0 (Draft)
