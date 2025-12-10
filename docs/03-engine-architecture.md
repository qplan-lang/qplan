# Engine Architecture

qplan 엔진은 다음 구조로 동작한다:

script
 ↓
Tokenizer
 ↓
Parser(EBNF 기반)
 ↓
AST
 ↓
Executor
   ├─ ExecutionContext
   └─ ModuleRegistry
