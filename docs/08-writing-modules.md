# 08-writing-modules.md

## 함수형 모듈 작성
```
export const echoModule = Object.assign(
  (inputs) => inputs,
  { id:"echo", description:"..." }
)
```

## 객체형 모듈 작성
```
export const fileModule = {
  id:"file",
  description:"파일 읽기/쓰기",
  execute(inputs, ctx) { ... }
}
```

## 메타데이터 작성 규칙
- id: 필수  
- description: 기능 설명  
- usage: Language 사용 예시  
- inputs: 받을 수 있는 옵션 목록  

