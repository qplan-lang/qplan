# QPlan Step System — Consolidated Design (v2 Draft)

본 문서는 지금까지 논의된 **QPlan Step 시스템 전체 설계 내용을 정리한 공식 스펙 문서**이다.  
Step은 QPlan 실행 흐름을 표현하고, 구조화하며, 점프/제어 기능까지 확장하기 위한 핵심 요소이다.

---

# 1. Step 도입 목적

Step은 다음을 가능하게 한다:

- 실행 단위의 명확한 구조화  
- 상위/하위 스텝 계층적 표현  
- UI 단계별 진행률 표시  
- AI가 스텝 기반 실행 계획을 생성  
- jump/break/loop 등 **흐름 제어(flow control)** 확장  

주석 기반 스텝(description-only)은 흐름 제어가 불가능하므로,  
**정식 문법 요소로 승격**하는 방향으로 확정.

---

# 2. Step 문법 정의

## 기본 형태
```
step "설명" {
    <statements>
}
```

## 확장 형태
```
step id="read" desc="파일 읽기" {
    file op="read" path="./a.txt" -> raw
}
```

## 추가 확장안 (선택)
```
step id="calc" type="task" desc="계산 단계" {
    math op="avg" arr=raw -> avg
}
```

---

# 3. StepNode 구조 (AST)

```
StepNode {
    id?: string
    desc?: string
    type?: string                // optional (task, group, loop 등)
    errorPolicy?: ErrorPolicy    // fail | continue | retry | jump
    outputVar?: string           // step 전체 결과를 받을 변수
    order: number                // 자동 증가
    path: string[]               // 계층 경로 (자동 생성)
    parent?: StepNode
    children: Statement[]
}
```

자동 생성 필드: `order`, `path`, `parent`, `children`

---

# 4. Sub-step 구조

Step은 Step을 포함할 수 있다:

```
step "전체 처리" {

    step "파일 읽기" {
        file op="read" path="./a.txt" -> raw
    }

    step "계산 처리" {
        math op="avg" arr=raw -> avg
    }

}
```

계층 트리 예:

```
root
 └─ 전체 처리
      ├─ 파일 읽기
      └─ 계산 처리
```

## 4.1 Sub-step 베스트 프랙티스
- 상위 Step은 고수준 작업 이름만 담고, 세부 로직은 Sub-step 으로 분리
- Sub-step 실행 중 에러가 나면 해당 Step의 onError 정책이 먼저 적용되며, 필요한 경우 Jump 로 상위 Step에서 에러 부분을 다시 호출할 수 있다.
- Sub-step 에서 return 한 값은 부모 Step에서도 ctx 변수로 접근 가능하다.

예시:
```
step id="pipeline" desc="루트 단계" -> pipelineResult {
    step id="prepare" desc="데이터 준비" -> prepareResult {
        file read path="./input.txt" -> raw
        return data=raw
    }

    step id="aggregate" desc="집계" onError="retry=2" -> aggResult {
        math add a=total b=unknown -> total   # 에러 → retry 정책 적용
        return sum=total
    }

    step id="report" desc="리포트 작성" -> reportResult {
        if aggResult.sum > 100 {
            jump to="review"
        }
        return summary="done"
    }

    step id="review" desc="재검토" onError="jump=\"cleanup\"" {
        ...
    }

    step id="cleanup" desc="마무리" {
        ...
    }

    return prepare=prepareResult aggregate=aggResult report=reportResult
}
```

---

# 5. Jump 문법 (흐름 제어)

## 문법
```
jump to="read"
```

Jump는 **Step ID** 로만 이동 가능  
(개별 Action 라인으로 점프 불가)

## 동작
- Executor는 StepNode 테이블에서 id 조회  
- 실행 포인터를 해당 Step 블록의 첫 문장으로 이동  

---

# 6. Step Output (옵션)

스텝 전체를 함수처럼 반환:

```
step id="read" desc="파일 읽기" -> result {
    file op="read" path="./a.txt" -> raw
    return data=raw count=rawCount
}
```

동작 방식:
- block 내 가장 마지막 Action 결과를 자동 반환  
- 또는 명시적 반환 방식 추가 가능
  - `return key=value ...` 문을 사용하면 Step 결과를 원하는 형태의 객체로 명시적으로 반환 가능

---

# 7. Step Error Policy (필수 기능)

```
step id="fetch" desc="네트워크 요청" onError="continue" {
    http url="https://..." -> out
}
```

지원 옵션:

| 옵션 | 의미 |
|------|------|
| fail | (기본) 에러 발생 시 전체 중단 |
| continue | 에러 무시하고 다음 step으로 |
| retry=3 | 3회 재시도 |
| jump="cleanup" | 오류 발생 시 특정 step으로 이동 |

## 7.1 정책별 동작 예시
- **fail (기본)**: 에러 발생 시 즉시 중단. 다른 정책이 없으면 자동 적용.
- **continue**: 에러를 기록하고 다음 Step 으로 이동. 실패한 Step 의 output 변수는 설정되지 않을 수 있음.
- **retry=n**: 지정한 횟수만큼 Step 전체를 재시도. 성공하면 정상 종료, 실패하면 마지막 에러를 던짐.
- **jump="stepId"**: 에러 발생 시 지정 Step 으로 바로 이동. Jump 대상이 존재해야 하며, Jump 후 실행은 해당 Step 의 첫 지점부터 진행.

예시 시퀀스:
```
step id="prepare" desc="초기화" {
    ...
}

step id="fetch" desc="데이터 수집" onError="retry=2" -> fetched {
    http url="..." -> raw
    math add a=raw b=unknown -> broken    # 실패 → retry
    return data=raw
}

step id="transform" desc="부가 처리" onError="jump=\"cleanup\"" {
    ...
}

step id="cleanup" desc="마무리" {
    ...
}
```

---

# 8. Executor Step Events

UI와 연동하기 위한 확장 이벤트:

```
onStepStart(stepInfo)
onStepEnd(stepInfo, result?)
onStepError(stepInfo, error)
onStepRetry(stepInfo, attempt, error)
onStepJump(stepInfo, targetStepId)
```

### stepInfo 예시:
```
{
    stepId: "calc",
    desc: "평균 계산",
    order: 3,
    parentStepId: "root",
    path: ["전체처리", "계산"],
}
```

---

# 9. Grammar (EBNF 확장)

```
StepStmt      = "step" , StepMeta , [ OutputBinding ] , Block ;
StepMeta      = QuotedString
              | ("id=" , Identifier , [ "type=" , Identifier ] , "desc=" , QuotedString) ;

JumpStmt      = "jump" , "to=" , Identifier ;
OutputBinding = "->" , Identifier ;
```

기존 Script → Statement 구문에 StepStmt / JumpStmt 추가.

---

# 10. Step Path 자동 생성 규칙

예:
```
step "전체 처리" {
    step "파일 읽기" { ... }
}
```

결과:
```
전체 처리      → ["전체 처리"]
파일 읽기     → ["전체 처리", "파일 읽기"]
```

UI에서 트리 렌더링, 진행률 표시 등에 활용.

---

# 11. Step 아키텍처: Executor에 넣지 않고 **별도 파일로 분리해야 하는 이유**

Step은 **flow-control layer**이고  
Executor는 **AST 실행기**이기 때문에 **역할이 완전히 다르다**.

### Executor에 Step 로직을 넣을 경우 문제점:
- 모든 흐름 제어(jump, retry, loop)가 Executor를 오염시킴  
- parallel/if/while 확장 시 유지보수 폭증  
- Step 트리 관리 불가능  
- 테스트 불가능  
- 향후 확장 포인트 차단  

### 따라서 Step 시스템은 **독립된 모듈로 분리**해야 한다.

---

# 12. 권장 파일 구조 

```
src/
 ├─ core/
 │    ├─ executor.ts            # AST 순수 실행기
 │    ├─ parser.ts
 │    └─ executionContext.ts
 ├─ step/
 │    ├─ stepTypes.ts           # StepNode 타입
 │    ├─ stepParser.ts          # Step 문법 파싱
 │    ├─ stepResolver.ts        # ID/Path/Order 생성
 │    ├─ stepController.ts      # Jump, Retry, ErrorPolicy 처리
 │    └─ stepEvents.ts          # 이벤트 발생기(onStepStart 등)
 └─ modules/                    # Action Modules
```

### 역할 요약

| 파일 | 역할 |
|------|------|
| stepParser.ts | step 문법 파싱 → StepNode 생성 |
| stepResolver.ts | Step ID 테이블, 경로(path), order 생성 |
| stepController.ts | jump / retry / errorPolicy 처리 |
| stepEvents.ts | Executor 호출용 이벤트 디스패처 |
| executor.ts | 오직 AST 실행만 담당 (Step 로직 없음) |

이 아키텍처는 가장 깔끔하고 확장성 높음.

---

# 13. 전체 기능 요약

| 기능 | 설명 | 상태 |
|------|------|------|
| Step 문법 | 실행 단위 구조화 | ✔ |
| Sub-step | 계층 트리 지원 | ✔ |
| Step Output | Step 결과 반환 | 옵션 |
| Step Type | task/group/loop 분류 | 옵션 |
| Step Error Policy | 실행 실패 대응 | ✔ 필수 |
| Jump | 스텝 이동 흐름 제어 | ✔ |
| Step Events | UI/로그 연동 | ✔ |
| Step Path | 트리 렌더링/로그 | ✔ |
| Step 아키텍처 분리 | 유지보수성/확장성 향상 | ✔ |

---

# 14. 결론

이 Step 시스템은  
**워크플로우 엔진 수준의 유연성**,  
**AI 생성 친화성**,  
**직관적 UI 연동**  
을 모두 충족하는 구조이며,  
이번 설계는 QPlan을 “단순 DSL”에서  
**정식 워크플로우 실행 엔진**으로 확장하는 핵심 기반이다.

- 문법 구조 명확  
- AST 트리 기반 step 모델  
- jump/flow-control 모듈화  
- executor 단순화  
- UI/AI 통합 최적화  

본 문서는 **QPlan Step System v2 — Final Specification**으로 간주된다.
