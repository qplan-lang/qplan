# qplan Examples

이 문서는 qplan DSL의 실제 사용 예제를 모아 놓은 문서입니다.  
각 예제는 qplan 엔진을 테스트하거나 학습할 때 사용할 수 있습니다.

---

# 1. Basic Fetch & Calc

```
FETCH price stock=005930 days=30 -> price
CALC ma20 price -> ma20
```

---

# 2. AI Analysis Example

```
FETCH price stock=005930 days=60 -> price
CALC ma20 price -> ma20

AI "현재 주가와 20일선의 관계를 분석해줘" USING price, ma20 -> analysis
```

---

# 3. Conditional Branching

```
FETCH price stock=005930 days=60 -> price
CALC ma20 price -> ma20

IF price.close > ma20:
    AI "강세 분석을 해줘" USING price, ma20 -> result
ELSE:
    AI "약세 분석을 해줘" USING price, ma20 -> result
END
```

---

# 4. Parallel Execution

```
PARALLEL:
    FETCH price stock=005930 days=60 -> price
    FETCH flow stock=005930 days=20 -> flow
END

AI "가격과 수급 데이터를 요약해줘" USING price, flow -> summary
```

---

# 5. Full Workflow Example

```
# 가격/수급 병렬 수집
PARALLEL:
    FETCH price stock=005930 days=120 -> price
    FETCH flow stock=005930 days=20 -> flow
END

# 파생치 계산
CALC ma20 price -> ma20
CALC ma60 price -> ma60

# 기술적 위치 분석
IF price.close > ma20:
    AI "단기 강세 여부 분석" USING price, ma20 -> short_term
ELSE:
    AI "단기 약세 여부 분석" USING price, ma20 -> short_term
END

IF price.close > ma60:
    AI "중기 강세 여부 분석" USING price, ma60 -> mid_term
ELSE:
    AI "중기 약세 여부 분석" USING price, ma60 -> mid_term
END

# 최종 결론
AI "단기/중기 분석을 종합해서 결론을 내려줘" USING short_term, mid_term -> final
```

---

# 6. Generic Automation Example (Stock과 무관)

```
FETCH http url="https://api.example.com/data" -> json
CALL parse_json input=json key="items" -> items

IF items.count > 0:
    AI "아이템 목록 설명해줘" USING items -> summary
ELSE:
    AI "데이터가 없다고 사용자에게 안내 메시지를 작성해줘" USING items -> summary
END
```

---

# 7. Multi-step AI-driven Workflow

```
AI "오늘 처리해야 하는 작업 리스트를 생성해줘" USING none -> tasks

CALL save_to_db data=tasks -> saved

AI "저장된 작업을 기준으로 우선순위를 다시 평가해줘" USING tasks -> ranked

CALL notify_user data=ranked -> notify
```

---

# 8. Error Handling Example

(추후 Engine 확장에서 TRY/CATCH 지원 예정)

```
FETCH price stock=INVALID days=30 -> price
AI "데이터가 없을 때 사용자에게 보여줄 메시지를 만들어줘" USING price -> fallback
```

---

# 9. Future Example Templates

추가될 예정:
- LOOP 예제
- FILE 모듈 예제
- HTTP 모듈 예제
- DevOps 자동화 파이프라인 예제
- RPA 자동화 예제

---

# Version
qplan examples v1.0 (Draft)
