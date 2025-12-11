# 07-registry.md

## ModuleRegistry 역할
- 모듈 id 기반 등록/조회  
- AI-friendly 문서를 위해 메타데이터 추출  

## 등록 방식
```
registry.register(mathModule)
registry.registerAll([fileModule, futureModule])
```

## id 없는 모듈 처리
- 경고 출력  
- AI에서 사용 불가  

## list()
```
registry.list()
→ [{ id, description, usage, inputs }]
```

