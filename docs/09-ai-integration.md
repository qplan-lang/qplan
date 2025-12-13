# 09-ai-integration.md

## AI를 이용해 QPlan 스크립트 자동 생성하기
QPlan 모듈 메타데이터는 LLM이 Language을 작성할 때 참고하도록 설계됨.

## 제공해야 할 정보
```
사용가능 모듈 목록 = registry.list()
```

이 목록에는:
- id  
- description  
- usage  
- inputs  
이 포함됨.

## AI 프롬프트 예시
```
아래 모듈들을 사용해 QPlan 스크립트를 생성하라:
[modules list]

요구: 파일 읽고 평균 계산 후 출력
```

## 권장 전략
- 기본 모듈은 최소  
- 확장 모듈은 선택적  
- AI가 오용하지 않도록 description/usage를 명확하게 작성

