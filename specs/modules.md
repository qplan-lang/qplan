# qplan Modules Specification

qplan의 모듈(Module)은 DSL에서 호출되는 **실행 가능한 기능 단위**이다.  
모든 기능은 `ActionModule` 인터페이스를 구현하여 추가된다.

---

# 1. Module Overview

모듈은 다음을 수행한다:
- DSL 명령(FETCH, CALL, CALC, AI 등)을 실제 기능으로 연결
- ExecutionContext 입력/출력 처리
- 외부 시스템(DB, API, AI 등)과의 연동

모듈은 런타임에서 `ModuleRegistry`에 등록되어 사용된다.

---

# 2. Module Interface

```java
public interface ActionModule {
    Object execute(Map<String, Object> inputs, ExecutionContext ctx);
}
```

### 파라미터 설명
- `inputs`  
  DSL에서 전달된 인자(key=value 형태)가 Map으로 제공됨  
- `ctx`  
  변수 저장/조회가 가능한 실행 컨텍스트

### 반환값
- 모듈 실행 결과(Object)  
- DSL에서 `-> 변수명`에 저장됨

---

# 3. Built-in Modules (기본 제공 모듈)

## 3.1 FETCH Module
외부 데이터 or 내부 저장소에서 값을 가져오는 모듈.

DSL:
```
FETCH price stock=005930 days=30 -> price
```

Java 예시:
```java
public class FetchPriceModule implements ActionModule {
    public Object execute(Map<String, Object> inputs, ExecutionContext ctx) {
        String stock = (String) inputs.get("stock");
        int days = Integer.parseInt(inputs.get("days").toString());
        return PriceService.fetch(stock, days);
    }
}
```

---

## 3.2 CALL Module
임의 기능 호출용 범용 모듈.

DSL:
```
CALL send_email to="test@test.com" message="hello" -> result
```

---

## 3.3 CALC Module
파생 데이터 생성.

DSL:
```
CALC ma20 price -> ma20
```

Java 예시:
```java
public class CalcMA20Module implements ActionModule {
    public Object execute(Map<String, Object> inputs, ExecutionContext ctx) {
        List<Double> prices = (List<Double>) inputs.get("price");
        return CalcUtils.ma(prices, 20);
    }
}
```

---

## 3.4 AI Module
AI 모델에게 질문을 보내는 모듈.

DSL:
```
AI "강세인지 분석해줘" USING price, ma20 -> analysis
```

Java 예시:
```java
public class AiModule implements ActionModule {
    public Object execute(Map<String, Object> inputs, ExecutionContext ctx) {
        String prompt = (String) inputs.get("prompt");
        Map<String, Object> vars = ctx.resolve(inputs.get("using"));
        return AiService.ask(prompt, vars);
    }
}
```

---

# 4. Custom Modules (사용자 정의 모듈)

사용자는 다음 절차로 모듈을 추가할 수 있다:

### 1) 모듈 생성
```java
public class MyModule implements ActionModule {
    public Object execute(Map<String, Object> inputs, ExecutionContext ctx) {
        // custom logic
        return something;
    }
}
```

### 2) 엔진 초기화 시 등록
```java
engine.register("MYMODULE", new MyModule());
```

### 3) DSL에서 사용
```
CALL MYMODULE x=10 y=20 -> result
```

---

# 5. Module Registry

모든 모듈은 Registry에 저장된다.

```java
public class ModuleRegistry {
    private final Map<String, ActionModule> modules = new HashMap<>();

    public void register(String name, ActionModule module) {
        modules.put(name.toUpperCase(), module);
    }

    public ActionModule get(String name) {
        return modules.get(name.toUpperCase());
    }
}
```

---

# 6. Execution Flow

```
DSL → Parser → AST → Executor → ModuleRegistry.get(name) 실행
```

Executor는 AST 노드의 action 이름을 기반으로 모듈을 찾고 실행한다.

---

# 7. Variables & Context

ExecutionContext는 변수 저장/조회 역할을 수행한다.

```java
public class ExecutionContext {
    private final Map<String, Object> vars = new HashMap<>();

    public void set(String name, Object value) { vars.put(name, value); }
    public Object get(String name) { return vars.get(name); }
}
```

---

# 8. Error Handling

모듈 실행 중 발생하는 오류는 Executor가 래핑하여 DSL 오류로 변환한다.

예:
- 모듈 없음 → `"Unknown module: FETCH_FOO"`
- 인자 누락 → `"Missing argument: stock"`

---

# 9. Future Module Ideas

| Module | 설명 |
|--------|------|
| HTTP | API 호출 |
| DB | SQL 실행 |
| FILE | 파일 읽기/쓰기 |
| SCHEDULE | 지연/스케줄 실행 |
| LOOP | 반복 처리 |
| PARSE | JSON/XML 파싱 |

---

# 10. Version
qplan modules spec v1.0 (Draft)
