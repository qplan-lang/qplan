# Changelog

QPlan의 변경 이력을 기록하는 문서입니다.  
버전별 새로운 기능, 개선 사항, 버그 수정 등을 명확히 정리합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 스타일을 따릅니다.

---

## [Unreleased]

### Added
- 초기 문서 구성: README, grammar.md, modules.md, architecture.md, examples.md  
- CONTRIBUTING.md 추가  
- CHANGELOG.md 생성  
- QPlan Language 기본 문법 설계  
- EBNF 기반 Language 스펙 정의  
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

# Versioning
본 프로젝트는 Semantic Versioning(semver.org)을 따릅니다.

---

# License
MIT License (예정)
