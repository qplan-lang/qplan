# QPlan QuickStart Guide — AI 실행 자동화를 위한 가장 쉬운 접근

## 1. QPlan은 어떤 역할을 하는가?

일반적인 AI(LLM)는 자연어를 이해하고 답변하는 데 매우 뛰어나지만,
실제 시스템 기능을 **직접 실행**하지는 못합니다.
예를 들어 “상품을 검색해줘”, “결제해줘” 같은 요청은 설명만 가능할 뿐 행동으로 옮기지 못합니다.

**QPlan은 이 한계를 해결하기 위해 만들어진 경량 AI Planning Language 및 실행 엔진입니다.**

- AI에게 “실행 계획을 QPlan 언어로 작성해달라”고 요청하면
- AI는 step 기반의 상세한 실행 플로우를 작성해주고
- QPlan 엔진은 그 계획을 실제 코드처럼 단계별로 실행합니다.
- 실행 과정에서 개발자가 작성한 검색, 필터링, 결제 등의 모듈이 호출됩니다.

즉,
**AI가 생각하고(QPlan 계획 작성), QPlan이 실행합니다.**

---

## 2. 매우 간단한 요약 예시

매우 간단히 표현하자면 아래와 같습니다.

- 사용자:
  > “신입 직원 마이크가 들어오니까 다음 주 월요일부터 일할 수 있도록 준비해줘”
- 귀하의 시스템(혹은 프로그램):
  QPlan을 통해 AI와 연동하여 실행 계획을 세우고,
  각각의 스텝(신입 정보 확인 → 장비/계정 준비 → 온보딩 미팅 일정 등록 → 진행 상황 보고)을 차례대로 진행
- 결과:
  → **온보딩 준비 완료**

이 한 줄 흐름이 QPlan이 제공하는 핵심 가치를 잘 보여줍니다.
사용자는 자연어로 요청하고, AI는 QPlan 언어로 계획을 만들고, QPlan이 실제 실행을 담당합니다.

---

## 3. 개발자가 준비해야 하는 것

QPlan을 도입하기 위해 알아야 할 내용은 많지 않습니다.
필요한 준비물은 다음 두 가지입니다.

---

### ✔ 1) 기능 모듈 준비 및 등록

이미 시스템에 존재하는 기능을 ActionModule 형태로 감싼 뒤, ModuleRegistry에 등록만 하면 됩니다.

예:

```ts
import { registry } from "qplan";

export const searchModule = {
  id: "search",
  description: "상품 검색",
  inputs: ["keyword"],
  async execute({ keyword }) {
    return await searchFromDB(keyword);
  }
};

registry.registerAll([
  searchModule,
  filterModule,
  askUserModule,
  paymentModule
]);
```

이처럼 id/description/inputs를 명확히 적고 registry에 등록하면,
AI가 어떤 모듈을 사용할 수 있는지 쉽게 파악하여 실행 계획을 작성합니다.

---

### ✔ 2) 사용자 요청을 기반으로 AI에게 실행 계획 요청

QPlan은 이 과정을 돕기 위해,
사용자 요구사항을 넣으면 AI 호출용 프롬프트를 자동으로 생성해주는 함수를 제공합니다.

```ts
import { buildAIPlanPrompt, setUserLanguage } from "qplan";

const requirement = "신입 직원 마이크가 들어오니까 다음 주 월요일부터 일할 수 있도록 준비해줘";
setUserLanguage("ko"); // 원하는 문자열 지정 가능
const prompt = buildAIPlanPrompt(requirement);
// → grammar summary, 모듈 목록(registry.list()) 등이 포함된,
//   QPlan 실행 계획 생성을 위한 LLM 프롬프트 문자열
```

이 `prompt`를 그대로 LLM에게 전달하면,
AI는 요구사항에 맞는 **step 기반 QPlan 스크립트**를 생성하게 됩니다.

예시(개념적 예):

```qplan
step id="fetch_profile" desc="마이크 정보 조회" -> profile {
  getEmployee name="Mike" start_date="2025-12-15" -> data
  return employee=data
}

step id="prepare_assets" desc="장비 및 계정 준비" -> assets {
  allocateDevices employee=profile.employee devices="laptop,monitor" -> gear
  provisionAccounts employee=profile.employee systems="email,slack,vpn" -> accounts
  return gear=gear accounts=accounts
}

step id="schedule" desc="온보딩 일정 생성" -> plan {
  scheduleMeeting title="마이크 온보딩" attendees=profile.employee.manager,date="다음 주 월요일 오전 10시" -> mtg
  assignMentor employee=profile.employee -> mentor
  return meeting=mtg mentor=mentor
}

step id="notify" desc="HR에게 준비 완료 보고" {
  notifyHR employee=profile.employee gear=assets.gear meeting=plan.meeting mentor=plan.mentor
}
```

---

## 4. QPlan 엔진으로 실행

AI가 작성한 QPlan 스크립트를 그대로 실행합니다.

```ts
const qplanScript = "..."; // AI에 요청해 생성된 QPlan script
const ctx = await runQplan(qplanScript, {
  registry, // 필요 시 커스텀 registry 전달
  env: { userId: session.userId },
  metadata: { requestId: trace.id },
  stepEvents: {
    onPlanStart(plan) { ui.showPlanStart(plan); },
    onStepStart(info, context) { ui.showStepStart(info, context?.env); },
    onStepEnd(info, result) { ui.showStepEnd(info, result); },
    onStepError(info, error) { ui.showStepError(info, error); },
    onPlanEnd(plan) { ui.showPlanEnd(plan); },
  }
});
```

QPlan은 각 Step을 순차적으로 실행하며
개발자가 만든 모듈을 호출하고,
각 단계의 상태를 이벤트로 전달합니다.

UI, 로그 기록, 알림 시스템 등은
이 stepEvents를 활용하여 구성할 수 있습니다.

---

## 5. 개발자가 QPlan Language 전체를 이해할 필요는 없습니다

QPlan의 상세 문법은 매우 풍부하지만,
일반적인 앱 개발자는 **전부 이해할 필요가 없습니다.**

필수적으로 알아야 하는 것은 다음 네 가지뿐입니다:

1. 모듈을 어떻게 만드는가
2. 모듈을 QPlan에 어떻게 등록하는가
3. `buildAIPlanPrompt(requirement: string)`를 사용해
   AI에게 어떻게 “실행 계획”을 요청하는가
4. `runQplan`으로 계획을 어떻게 실행하고 step 이벤트를 처리하는가

---

## ✨ 결론

QPlan은 다음과 같은 가치를 제공합니다:

- 자연어 요청을 실제 기능 실행으로 연결
- AI가 작성한 실행 계획을 정확하고 안정적으로 수행
- 개발자는 모듈을 정의하고, step 이벤트를 UI/로직에 활용하기만 하면 됨
- 어떤 서비스에도 쉽게 붙일 수 있는 경량 워크플로우 엔진

**즉, QPlan은 “AI가 행동할 수 있게 해주는 가장 단순하고 강력한 방법”입니다.**
