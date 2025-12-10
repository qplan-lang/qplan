# qplan Overview

qplan은 AI와 사람이 함께 작성하는 워크플로우 DSL이다.

주요 특징:
- 경량 DSL 문법
- Tokenizer → Parser → AST → Executor 구조
- 모듈 기반 확장(FETCH, CALC, CALL, AI)
- 병렬 실행(PARALLEL)
- 비동기 Future / Join
- Timeout, Concurrency 지원
- 파일/HTTP/AI 등 다양한 모듈 연결 가능
