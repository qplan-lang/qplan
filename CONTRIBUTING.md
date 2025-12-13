# Contributing to QPlan

QPlan 프로젝트에 기여해주셔서 감사합니다!  
이 문서는 코드, 문서, 아이디어 등 다양한 방식으로 기여하는 방법을 안내합니다.

---

# 1. How to Contribute

QPlan은 초기 개발 단계이므로 다음과 같은 기여를 특히 환영합니다:

- 버그 리포트  
- 문법(Language) 개선 제안  
- Parser / Lexer / AST 관련 코드  
- Execution Engine 개선  
- 새로운 모듈(ActionModule) 추가  
- 문서 작성/보완  
- 예제(Examples) 추가  

---

# 2. Issues

버그 또는 기능 제안은 **GitHub Issues**에 등록해주세요.

이슈 작성 시 포함하면 좋은 내용:

- 문제 요약  
- 재현 방법  
- 기대되는 동작  
- 실제 동작  
- 관련 코드 또는 스크립트  
- 환경 정보(JDK 버전 등)

---

# 3. Pull Requests

PR은 다음 절차에 따라 제출해주세요:

1. 저장소를 fork합니다.  
2. 새로운 브랜치를 생성합니다.  
   ```
   git checkout -b feature/my-change
   ```
3. 변경 사항을 커밋합니다.  
4. PR을 제출하고, 변경 목적과 내용을 상세히 작성합니다.  

### PR 기준

- 빌드 에러 없어야 합니다.  
- 문법/엔진과 관련된 변경은 반드시 문서도 수정해야 합니다.  
- 가능한 작은 단위로 PR을 나누면 리뷰가 쉽습니다.  

---

# 4. Code Style

- Java 17+  
- Class/Method 명은 명확하고 기능 중심으로 작성  
- 모듈 이름은 대문자(SNAKE_CASE) 사용  
- Language 관련 코드는 테스트 중심 개발 권장  

---

# 5. Tests

추가되는 기능은 가능한 테스트와 함께 PR 제출을 부탁드립니다.

테스트 구조 초안(예정):

```
src/
 └─ test/
     ├─ lexer/
     ├─ parser/
     ├─ executor/
     └─ modules/
```

---

# 6. Documentation

문서 개선도 큰 기여입니다.

다음 파일을 업데이트하면 좋습니다:

- README.md  
- grammar.md  
- modules.md  
- architecture.md  
- examples.md  

---

# 7. Branch Strategy

- `main`: 최신 안정 버전  
- `dev`: 개발 브랜치  
- 기능 개발은 `feature/*` 브랜치에서 진행  

---

# 8. Development Setup

### Requirements

- Java 17+  
- Maven or Gradle  
- IDE (IntelliJ 추천)

### Build

```
./gradlew build
```

또는

```
mvn clean install
```

---

# 9. Module Contribution Guide

새로운 모듈 추가 시:

1. `ActionModule` 구현  
2. 필요한 입력 파라미터 정의  
3. 예외 처리 추가  
4. ModuleRegistry에 등록  
5. examples.md에 예제 추가  
6. modules.md 문서 업데이트  

---

# 10. Code of Conduct

모든 기여자는 다음을 지켜야 합니다:

- 존중하는 커뮤니케이션  
- 타인의 기여를 귀중하게 대함  
- 비난/모욕/차별 금지  
- 공동 목표: QPlan의 품질 향상  

---

# 11. License

모든 기여는 QPlan의 MIT License에 따라 공개됩니다.

---

# 12. Questions?

궁금한 점이 있다면 Issues 또는 Discussions에 자유롭게 남겨주세요.

감사합니다!  
QPlan Team
