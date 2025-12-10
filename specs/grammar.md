# qplan DSL Grammar (EBNF Specification)

본 문서는 **qplan DSL v1**의 정식 문법(EBNF) 정의서이다.  
파서(Parser) 구현 및 IDE 하이라이팅을 위한 기준으로 사용된다.

---

# 1. Overview

qplan DSL은 AI가 작성하기 쉽고 사람이 읽기 쉽게 설계된 **경량 워크플로우 언어**다.

지원 요소:
- FETCH / CALL / CALC
- AI
- IF / ELSE / END
- PARALLEL / END
- 변수 참조
- key=value 인자
- 주석

---

# 2. EBNF Grammar

```
script          = { statement } ;

statement       = fetch_stmt
                | call_stmt
                | calc_stmt
                | ai_stmt
                | if_block
                | parallel_block
                | comment ;

comment         = "#" { any } ;

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
number          = digit { digit } ;
string          = '"' { any } '"' ;

letter          = "A" | ... | "Z" | "a" | ... | "z" ;
digit           = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```

---

# 3. Syntax Rules

### 3.1 Statements must appear one per line  
예:
```
FETCH price stock=005930 days=60 -> price
CALC ma20 price -> ma20
```

### 3.2 Blocks can be indented  
예:
```
IF price.close > ma20:
    AI "강세" USING price -> out
END
```

### 3.3 Comments  
```
# This is a comment
```

---

# 4. Examples

### 4.1 Basic
```
FETCH price stock=005930 days=30 -> price
CALC ma20 price -> ma20
```

### 4.2 Condition
```
IF price.close > ma20:
    AI "강세" USING price, ma20 -> analysis
ELSE:
    AI "약세" USING price, ma20 -> analysis
END
```

### 4.3 Parallel
```
PARALLEL:
    FETCH price stock=005930 days=60 -> price
    FETCH flow stock=005930 days=20 -> flow
END
```

---

# 5. Reserved Keywords

```
FETCH
CALL
CALC
AI
IF
ELSE
END
PARALLEL
USING
```

---

# 6. Validation Notes

- 모든 변수명은 identifier 규칙을 따른다.  
- `-> 변수명`은 필수.  
- IF/ELSE/END, PARALLEL/END는 반드시 쌍으로 맞아야 한다.  
- 문자열은 반드시 쌍따옴표로 감싼다.  

---

# 7. Future Extensions

예정된 확장:
- LOOP  
- TRY / CATCH  
- MODULE import  
- 타입 시스템  
- 상수 정의  

---

# 8. Version  
qplan DSL v1.0 (Draft)
