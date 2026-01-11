# QPlan Execution Control

실행 제어(Execution Control)는 QPlan 스크립트 실행의 수명 주기를 관리하는 기능을 제공하며, 실행 중지(Abort), 일시중지(Pause), 재개(Resume) 및 상태 모니터링을 포함합니다.

## 기능

### 1. Abort (중지)
실행 중인 Plan을 강제로 중지합니다.

```typescript
const qplan = new QPlan(script);
const runPromise = qplan.run();

// 중지
qplan.abort();

try {
  await runPromise;
} catch (err) {
  if (err instanceof AbortError) {
    console.log("Execution aborted");
  }
}
```

### 2. Pause/Resume (일시중지/재개)
실행을 일시중지하고 나중에 재개할 수 있습니다.

```typescript
const qplan = new QPlan(script);
const runPromise = qplan.run();

// 일시중지
qplan.pause();
console.log(qplan.getState()); // "paused"

// 재개
qplan.resume();
console.log(qplan.getState()); // "running"

await runPromise;
```

### 3. Timeout (타임아웃)
실행 시간을 제한할 수 있습니다.

```typescript
const qplan = new QPlan(script);

try {
  await qplan.run({
    timeout: 5000  // 5초 타임아웃
  });
} catch (err) {
  if (err instanceof AbortError) {
    console.log("Execution timed out");
  }
}
```

### 4. Checkpoint (체크포인트)
실행 중 상태를 스냅샷으로 저장하고 복원할 수 있습니다.

```typescript
const qplan = new QPlan(script);

// 자동 체크포인트 (각 Step 전)
await qplan.run({
  autoCheckpoint: true,
  maxSnapshots: 10  // 최대 10개 유지
});

// 체크포인트 조회
const checkpoints = qplan.getCheckpoints();
const lastCheckpoint = qplan.getLastCheckpoint();

// 체크포인트 복원
if (lastCheckpoint) {
  await qplan.restoreCheckpoint(lastCheckpoint);
}

// 수동 체크포인트 생성
const snapshot = qplan.createCheckpoint("my-checkpoint");
```

### 5. State Monitoring (상태 모니터링)
실행 상태를 실시간으로 확인할 수 있습니다.

```typescript
const qplan = new QPlan(script);

// 상태 모니터링
const monitor = setInterval(() => {
  const status = qplan.getStatus();
  console.log(`State: ${status.state}, Step: ${status.currentStepId}`);
  console.log(`Elapsed: ${status.elapsedTime}ms`);
}, 1000);

await qplan.run();
clearInterval(monitor);
```

### 6. Execution Events (실행 이벤트)
실행 상태 변경이나 제어 명령에 반응하는 이벤트를 등록할 수 있습니다.

```typescript
await qplan.run({
  stepEvents: {
    // 상태 변경 감지
    onStateChange: (newState, oldState, ctx) => {
      console.log(`State changed: ${oldState} -> ${newState}`);
    },
    
    // 제어 명령 감지
    onPause: (ctx) => console.log("Execution paused"),
    onResume: (ctx) => console.log("Execution resumed"),
    onAbort: (ctx) => console.log("Execution aborted"),
    
    // 타임아웃 감지
    onTimeout: (ctx) => console.log("Execution timed out"),
  }
});
```

## API

### QPlan 메서드

#### 실행 제어
- `abort()`: 실행 중지
- `pause()`: 일시중지
- `resume()`: 재개
- `getState()`: 현재 상태 조회 (idle/running/paused/completed/aborted/error)
- `getStatus()`: 상세 상태 정보 조회
- `getElapsedTime()`: 경과 시간 조회 (밀리초)

#### 체크포인트
- `createCheckpoint(label?)`: 체크포인트 생성
- `restoreCheckpoint(snapshot)`: 체크포인트 복원
- `getCheckpoints()`: 모든 체크포인트 조회
- `getCheckpoint(id)`: 특정 체크포인트 조회
- `getLastCheckpoint()`: 최근 체크포인트 조회
- `clearCheckpoints()`: 모든 체크포인트 삭제

### RunOptions

```typescript
interface QPlanRunOptions {
  // 기존 옵션
  registry?: ModuleRegistry;
  stepEvents?: StepEventEmitter;
  env?: Record<string, any>;
  metadata?: Record<string, any>;
  runId?: string;
  
  // 실행 제어 옵션
  timeout?: number;           // 타임아웃 (밀리초)
  autoCheckpoint?: boolean;   // 자동 체크포인트
  maxSnapshots?: number;      // 최대 스냅샷 개수
  controller?: ExecutionController;  // 커스텀 컨트롤러
}
```

### StepEventEmitter (확장됨)

기존 Step 이벤트 외에 실행 제어 이벤트가 추가되었습니다.

```typescript
interface StepEventEmitter {
  // 기존 이벤트
  onPlanStart?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onPlanEnd?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepStart?(info: StepEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepEnd?(info: StepEventInfo, result?: any, context?: StepEventRunContext): Promise<void> | void;
  onStepError?(info: StepEventInfo, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepRetry?(info: StepEventInfo, attempt: number, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepJump?(info: StepEventInfo, targetStepId: string, context?: StepEventRunContext): Promise<void> | void;
  
  // 실행 제어 이벤트
  onAbort?(context?: StepEventRunContext): Promise<void> | void;
  onPause?(context?: StepEventRunContext): Promise<void> | void;
  onResume?(context?: StepEventRunContext): Promise<void> | void;
  onTimeout?(context?: StepEventRunContext): Promise<void> | void;
  onStateChange?(newState: ExecutionState, oldState: ExecutionState, context?: StepEventRunContext): Promise<void> | void;
}
```

### ExecutionState

```typescript
enum ExecutionState {
  IDLE = "idle",           // 대기 중
  RUNNING = "running",     // 실행 중
  PAUSED = "paused",       // 일시중지
  COMPLETED = "completed", // 완료
  ABORTED = "aborted",     // 중지됨
  ERROR = "error"          // 에러
}
```

### ExecutionSnapshot

```typescript
interface ExecutionSnapshot {
  snapshotId: string;
  runId: string;
  timestamp: number;
  state: ExecutionState;
  currentStepId?: string;
  context: Record<string, any>;
  blockStack: BlockStackFrame[];
}
```

## 예제

전체 예제는 `examples/22_exam_execution_control.js`를 참고하세요.

```bash
node examples/22_exam_execution_control.js
```

## 사용 사례

### 1. 장시간 실행 작업 관리
```typescript
const qplan = new QPlan(longRunningScript);

// UI에서 중지 버튼 클릭 시
stopButton.onclick = () => qplan.abort();

// UI에서 일시중지 버튼 클릭 시
pauseButton.onclick = () => qplan.pause();
resumeButton.onclick = () => qplan.resume();

await qplan.run({ timeout: 300000 }); // 5분 타임아웃
```

### 2. 에러 복구
```typescript
const qplan = new QPlan(script);

try {
  await qplan.run({ autoCheckpoint: true });
} catch (err) {
  // 에러 발생 시 이전 체크포인트로 복원
  const lastGoodCheckpoint = qplan.getCheckpoints()
    .filter(cp => cp.state === ExecutionState.RUNNING)
    .pop();
  
  if (lastGoodCheckpoint) {
    await qplan.restoreCheckpoint(lastGoodCheckpoint);
    // 재시도 로직
  }
}
```

### 3. 진행률 표시
```typescript
const qplan = new QPlan(script);

const progressBar = setInterval(() => {
  const status = qplan.getStatus();
  const progress = calculateProgress(status);
  updateUI(progress);
}, 500);

await qplan.run();
clearInterval(progressBar);
```

## 주의사항

1. **Abort는 즉시 중지되지 않을 수 있습니다**: 현재 실행 중인 모듈이 완료될 때까지 기다립니다.
2. **Checkpoint는 메모리를 사용합니다**: `maxSnapshots` 옵션으로 제한하세요.
3. **Timeout은 정확하지 않을 수 있습니다**: JavaScript의 타이머 정확도에 의존합니다.
4. **Pause 중에도 현재 노드는 완료됩니다**: 다음 노드 실행 전에 일시중지됩니다.

## 마이그레이션 가이드

기존 코드는 변경 없이 그대로 작동합니다. 실행 제어 기능은 선택적으로 사용할 수 있습니다.

```typescript
// 기존 코드 (변경 없음)
const ctx = await runQplan(script);

// 새로운 기능 사용
const qplan = new QPlan(script);
setTimeout(() => qplan.abort(), 5000);
await qplan.run({ timeout: 10000 });
```
