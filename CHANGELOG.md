# Changelog

qplan의 변경 이력을 기록하는 문서입니다.  
버전별 새로운 기능, 개선 사항, 버그 수정 등을 명확히 정리합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 스타일을 따릅니다.

---

## [Unreleased]

### Added
- 초기 문서 구성: README, grammar.md, modules.md, architecture.md, examples.md  
- CONTRIBUTING.md 추가  
- CHANGELOG.md 생성  
- qplan DSL 기본 문법 설계  
- EBNF 기반 DSL 스펙 정의  
- 기본 모듈 구조(FETCH, CALC, AI, CALL) 개념 정의  
- Execution Engine 아키텍처 설계 (Tokenizer → Parser → AST → Executor)

### Changed
- 문서 구조 개선 (docs/ 폴더 기반 정리 예정)

### Fixed
- 없음

---

## [0.1.0] - Initial Draft (예정)

### Added
- Tokenizer 초안
- Parser 초안
- AST Node 구조 정의
- ExecutionContext / ModuleRegistry 골격
- 기본 모듈 샘플(FETCH, CALC, AI)
- 첫 실행 예제 스크립트 테스트

### Notes
- 이 버전은 MVP에 해당하며 실험적 상태
- 병렬 실행(PARALLEL) 베타 적용 예정

---

## [0.2.0] - Future Release (예정)

### Added
- PARALLEL 안정화
- 조건 분기(IF/ELSE) 개선
- 에러 메시지 개선
- 모듈 확장 API 고도화

### Changed
- AST 구조 리팩터링
- Lexer/Parser 성능 개선

### Fixed
- 초기 파싱 오류

---

## [0.3.0] - Future Release (예정)

### Added
- Plugin Module System
- Logging / Tracing
- qplan Studio GUI 프로토타입

---

## [0.4.0+] - Long-term Roadmap (예정)

### Added
- Cloud Runner
- 모듈 마켓플레이스 구조
- LOOP / TRY-CATCH / IMPORT 같은 언어 확장
- 타입 시스템

---

# Versioning
본 프로젝트는 Semantic Versioning(semver.org)을 따릅니다.

---

# License
MIT License (예정)
