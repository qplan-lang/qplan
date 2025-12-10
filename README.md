# qplan  
**AI-Generated Workflow DSL & Execution Engine**

qplan은 **AI가 작성하고 시스템이 실행하는** 경량 워크플로우 DSL이다.  
데이터 수집, 분석, 자동화, 주식 시스템, RPA 등 다양한 도메인에서  
**플랜을 언어로 표현하고 실행**할 수 있도록 설계되었다.

---

## ✨ Features

- **AI-friendly DSL**  
  자연어 기반 AI가 작성하기 쉬운 최소 문법으로 구성.  

- **Deterministic Execution**  
  모든 명령은 AST로 파싱되어 안정적으로 실행.  

- **모듈 기반 확장성**  
  원하는 기능을 `Module` 형태로 등록하여 바로 사용 가능.  

- **조건/병렬 처리 지원**  
  IF / ELSE / PARALLEL 블록으로 복잡한 흐름 표현.  

- **도메인 비종속**  
  주식 자동화뿐 아니라 데이터 파이프라인, 크롤링, DevOps 등 범용 사용 가능.

---

# 🚀 qplan DSL Example

```qplan
PARALLEL:
    FETCH price stock=005930 days=60 -> price
    FETCH flow stock=005930 days=20 -> flow
END

CALC ma20 price -> ma20

IF price.close > ma20:
    AI "강세 분석을 해줘" USING price, ma20 -> result
ELSE:
    AI "약세 분석을 해줘" USING price, ma20 -> result
END
```

---

# 📚 DSL Grammar (EBNF Draft)

```
script          = { statement } ;

statement       = fetch_stmt
                | call_stmt
                | calc_stmt
                | ai_stmt
                | if_block
                | parallel_block ;

fetch_stmt      = "FETCH" identifier { argument } "->" identifier ;
call_stmt       = "CALL" identifier { argument } "->" identifier ;
calc_stmt       = "CALC" identifier identifier "->" identifier ;
ai_stmt         = "AI" string "USING" identifier_list "->" identifier ;

if_block        = "IF" condition ":" { statement }
                  [ "ELSE:" { statement } ]
                  "END" ;

parallel_block  = "PARALLEL:" { statement } "END" ;

argument        = identifier "=" value ;
identifier_list = identifier { "," identifier } ;

condition       = identifier comparator value ;

comparator      = ">" | "<" | ">=" | "<=" | "==" | "!="
                | "EXISTS" | "NOT_EXISTS" ;

value           = number | string | identifier ;
identifier      = letter { letter | digit | "_" } ;
string          = '"' { any } '"' ;
```

---

# 🏗 Architecture Overview

```
qplan script
      ↓
Tokenizer → Parser → AST → Executor
                   ↑
             Module Registry
```

---

# 📦 Project Structure

```
qplan/
 ├─ src/
 │   ├─ lexer/
 │   ├─ parser/
 │   ├─ executor/
 │   ├─ modules/
 │   └─ core/
 ├─ docs/
 ├─ examples/
 └─ README.md
```

---

# 🧩 Module System

```java
public interface ActionModule {
    Object execute(Map<String, Object> inputs, ExecutionContext ctx);
}
```

---

# 📅 Roadmap

### v0.1
- Tokenizer  
- Parser  
- Executor  
- 기본 모듈(FETCH, CALC, AI)

### v0.2
- PARALLEL  
- 조건 분기 개선  

### v0.3
- Plugin Module System  

### v0.4+
- qplan Studio  
- Cloud Runner  

---

# 📝 License
MIT License (예정)

---

# 🤝 Contributing
초기 개발 단계로 제안/PR 대환영.
