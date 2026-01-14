# QPlan Execution Control

Execution control allows you to manage the lifecycle of a QPlan script execution, including aborting, pausing, resuming, and monitoring its state.

## Features

### 1. Abort
Forcibly stops a running Plan.

```typescript
const qplan = new QPlan(script);
const runPromise = qplan.run();

// Abort
qplan.abort();

try {
  await runPromise;
} catch (err) {
  if (err instanceof AbortError) {
    console.log("Execution aborted");
  }
}
```

### 2. Pause/Resume
You can pause execution and resume it later.

```typescript
const qplan = new QPlan(script);
const runPromise = qplan.run();

// Pause
qplan.pause();
console.log(qplan.getState()); // "paused"

// Resume
qplan.resume();
console.log(qplan.getState()); // "running"

await runPromise;
```

### 3. Timeout
You can limit the execution time.

```typescript
const qplan = new QPlan(script);

try {
  await qplan.run({
    timeout: 5000  // 5 second timeout
  });
} catch (err) {
  if (err instanceof AbortError) {
    console.log("Execution timed out");
  }
}
```

### 4. Checkpoint
You can save the execution state as a snapshot and restore it.

```typescript
const qplan = new QPlan(script);

// Auto checkpoint (before each Step)
await qplan.run({
  autoCheckpoint: true,
  maxSnapshots: 10  // Keep max 10 snapshots
});

// Get checkpoints
const checkpoints = qplan.getCheckpoints();
const lastCheckpoint = qplan.getLastCheckpoint();

// Restore checkpoint
if (lastCheckpoint) {
  await qplan.restoreCheckpoint(lastCheckpoint);
}

// Create manual checkpoint
const snapshot = qplan.createCheckpoint("my-checkpoint");
```

### 5. State Monitoring
You can monitor the execution state in real-time.

```typescript
const qplan = new QPlan(script);

// Monitor state
const monitor = setInterval(() => {
  const status = qplan.getStatus();
  console.log(`State: ${status.state}, Step: ${status.currentStepId}`);
  console.log(`Elapsed: ${status.elapsedTime}ms`);
}, 1000);

await qplan.run();
clearInterval(monitor);
```

### 6. Execution Events
You can register events that react to state changes or control commands.

```typescript
await qplan.run({
  stepEvents: {
    // Detect state changes
    onStateChange: (newState, oldState, ctx) => {
      console.log(`State changed: ${oldState} -> ${newState}`);
    },
    
    // Detect control commands
    onPause: (ctx) => console.log("Execution paused"),
    onResume: (ctx) => console.log("Execution resumed"),
    onAbort: (ctx) => console.log("Execution aborted"),
    
    // Detect timeout
    onTimeout: (ctx) => console.log("Execution timed out"),
  }
});
```

## API

### QPlan Methods

#### Execution Control
- `abort()`: Stop execution
- `pause()`: Pause execution
- `resume()`: Resume execution
- `getState()`: Get current state (idle/running/paused/completed/aborted/error)
- `getStatus()`: Get detailed status information
- `getElapsedTime()`: Get elapsed time (ms)

#### Checkpoints
- `createCheckpoint(label?)`: Create a checkpoint
- `restoreCheckpoint(snapshot)`: Restore a checkpoint
- `getCheckpoints()`: Get all checkpoints
- `getCheckpoint(id)`: Get a specific checkpoint
- `getLastCheckpoint()`: Get the most recent checkpoint
- `clearCheckpoints()`: Delete all checkpoints

### RunOptions

```typescript
interface QPlanRunOptions {
  // Existing options
  registry?: ModuleRegistry;
  stepEvents?: StepEventEmitter;
  env?: Record<string, any>;
  metadata?: Record<string, any>;
  runId?: string;
  
  // Execution Control Options
  timeout?: number;           // Timeout (ms)
  autoCheckpoint?: boolean;   // Auto checkpoint
  maxSnapshots?: number;      // Max snapshots to keep
  controller?: ExecutionController;  // Custom controller
}
```

### StepEventEmitter (Extended)

Execution control events have been added in addition to the existing Step events.

```typescript
interface StepEventEmitter {
  // Existing Events
  onPlanStart?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onPlanEnd?(plan: PlanEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepStart?(info: StepEventInfo, context?: StepEventRunContext): Promise<void> | void;
  onStepEnd?(info: StepEventInfo, result?: any, context?: StepEventRunContext): Promise<void> | void;
  onStepError?(info: StepEventInfo, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepRetry?(info: StepEventInfo, attempt: number, error: Error, context?: StepEventRunContext): Promise<void> | void;
  onStepJump?(info: StepEventInfo, targetStepId: string, context?: StepEventRunContext): Promise<void> | void;
  
  // Execution Control Events
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
  IDLE = "idle",           // Idle
  RUNNING = "running",     // Running
  PAUSED = "paused",       // Paused
  COMPLETED = "completed", // Completed
  ABORTED = "aborted",     // Aborted
  ERROR = "error"          // Error
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

## Examples

For the full example, please refer to `examples/22_exam_execution_control.js`.

```bash
node examples/22_exam_execution_control.js
```

## Use Cases

### 1. Managing Long-Running Tasks
```typescript
const qplan = new QPlan(longRunningScript);

// When stop button is clicked in UI
stopButton.onclick = () => qplan.abort();

// When pause button is clicked in UI
pauseButton.onclick = () => qplan.pause();
resumeButton.onclick = () => qplan.resume();

await qplan.run({ timeout: 300000 }); // 5 minutes timeout
```

### 2. Error Recovery
```typescript
const qplan = new QPlan(script);

try {
  await qplan.run({ autoCheckpoint: true });
} catch (err) {
  // Restore to previous checkpoint on error
  const lastGoodCheckpoint = qplan.getCheckpoints()
    .filter(cp => cp.state === ExecutionState.RUNNING)
    .pop();
  
  if (lastGoodCheckpoint) {
    await qplan.restoreCheckpoint(lastGoodCheckpoint);
    // Retry logic
  }
}
```

### 3. Progress Indication
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

## Caveats

1. **Abort might not be immediate**: It waits for the currently running module to complete.
2. **Module-level control**: Modules that run long loops or waits should call `await ctx.checkControl()` periodically so pause/abort requests are honored inside the module.
3. **Checkpoints consume memory**: Limit them using the `maxSnapshots` option.
4. **Timeout might not be exact**: It depends on the accuracy of JavaScript timers.
5. **Current node completes during Pause**: Execution pauses before the *next* node starts.

## Migration Guide

Existing code works without changes. Execution control features can be used optionally.

```typescript
// Existing code (No changes)
const ctx = await runQplan(script);

// Using new features
const qplan = new QPlan(script);
setTimeout(() => qplan.abort(), 5000);
await qplan.run({ timeout: 10000 });
```
