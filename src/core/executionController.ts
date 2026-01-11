/**
 * ExecutionController
 * -----------------------------------------
 * QPlan 실행을 제어하는 컨트롤러
 * 
 * 기능:
 * - Abort: 실행 중지
 * - Pause/Resume: 일시중지 및 재개
 * - Timeout: 실행 시간 제한
 * - Checkpoint: 실행 상태 스냅샷
 * - State Management: 실행 상태 추적
 */

import { ExecutionContext } from "./executionContext.js";
import { StepEventEmitter, StepEventRunContext } from "../step/stepEvents.js";

export enum ExecutionState {
    IDLE = "idle",
    RUNNING = "running",
    PAUSED = "paused",
    COMPLETED = "completed",
    ABORTED = "aborted",
    ERROR = "error",
}

export interface BlockStackFrame {
    blockId: string;
    statementIndex: number;
    loopIndex?: number;
    loopIterator?: string;
}

export interface ExecutionSnapshot {
    snapshotId: string;
    runId: string;
    timestamp: number;
    state: ExecutionState;
    currentStepId?: string;
    context: Record<string, any>;
    blockStack: BlockStackFrame[];
}

export interface ExecutionControllerOptions {
    timeout?: number; // 밀리초 단위
    autoCheckpoint?: boolean; // Step마다 자동 체크포인트
    maxSnapshots?: number; // 최대 스냅샷 개수
}

export class AbortError extends Error {
    constructor(message: string = "Execution aborted by user") {
        super(message);
        this.name = "AbortError";
    }
}

export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TimeoutError";
    }
}

export class ExecutionController {
    private _state: ExecutionState = ExecutionState.IDLE;
    private aborted = false;
    private pausePromise?: Promise<void>;
    private pauseResolve?: () => void;
    private snapshots: ExecutionSnapshot[] = [];
    private timeoutId?: ReturnType<typeof setTimeout>;
    private startTime?: number;
    private blockStack: BlockStackFrame[] = [];
    private currentStepId?: string;
    private eventEmitter?: StepEventEmitter;
    private runContext?: StepEventRunContext;
    private runId?: string;

    constructor(private options: ExecutionControllerOptions = {}) { }

    setEventEmitter(emitter: StepEventEmitter) {
        this.eventEmitter = emitter;
    }

    // ========================================
    // State Management
    // ========================================

    get state(): ExecutionState {
        return this._state;
    }

    setState(state: ExecutionState): void {
        const oldState = this._state;
        if (oldState !== state) {
            this._state = state;
            this.eventEmitter?.onStateChange?.(state, oldState, this.runContext);
        }
    }

    isIdle(): boolean {
        return this._state === ExecutionState.IDLE;
    }

    isRunning(): boolean {
        return this._state === ExecutionState.RUNNING;
    }

    isPaused(): boolean {
        return this._state === ExecutionState.PAUSED;
    }

    isCompleted(): boolean {
        return this._state === ExecutionState.COMPLETED;
    }

    isAborted(): boolean {
        return this._state === ExecutionState.ABORTED || this.aborted;
    }

    isError(): boolean {
        return this._state === ExecutionState.ERROR;
    }

    /**
     * 각 노드 실행 전 호출하여 제어 상태 확인
     */
    async checkControl(): Promise<void> {
        // 중지 확인
        if (this.aborted) {
            throw new AbortError();
        }

        // 일시중지 확인
        if (this.pausePromise) {
            await this.pausePromise;
        }

        // 재확인 (일시중지 해제 후 중지되었을 수 있음)
        if (this.aborted) {
            throw new AbortError();
        }
    }

    // ========================================
    // Execution Control
    // ========================================

    start(runContext: StepEventRunContext): void {
        this.runContext = runContext;
        this.runId = runContext.runId;
        this.setState(ExecutionState.RUNNING);
        this.aborted = false;
        this.startTime = Date.now();

        // 타임아웃 설정
        if (this.options.timeout && this.options.timeout > 0) {
            this.setTimeout(this.options.timeout);
        }
    }

    /**
     * 실행 중지 (강제 종료)
     */
    abort(): void {
        if (this._state === ExecutionState.COMPLETED || this._state === ExecutionState.ABORTED) {
            return;
        }
        this.setState(ExecutionState.ABORTED);
        this.aborted = true;
        this.clearTimeout();

        this.eventEmitter?.onAbort?.(this.runContext);

        // 일시중지 상태였다면 재개하여 abort 처리
        if (this.pauseResolve) {
            this.pauseResolve();
            this.pausePromise = undefined;
            this.pauseResolve = undefined;
        }
    }

    /**
     * 일시중지
     */
    pause(): void {
        if (this._state !== ExecutionState.RUNNING) {
            return;
        }
        this.setState(ExecutionState.PAUSED);
        this.eventEmitter?.onPause?.(this.runContext);

        this.pausePromise = new Promise<void>((resolve) => {
            this.pauseResolve = resolve;
        });
    }

    /**
     * 재개
     */
    resume(): void {
        if (this._state !== ExecutionState.PAUSED) {
            return;
        }
        this.setState(ExecutionState.RUNNING); // setState triggers onStateChange
        this.eventEmitter?.onResume?.(this.runContext);

        if (this.pauseResolve) {
            this.pauseResolve();
            this.pausePromise = undefined;
            this.pauseResolve = undefined;
        }
    }

    // ...

    complete(): void {
        if (this._state === ExecutionState.ABORTED) {
            return;
        }
        this.setState(ExecutionState.COMPLETED);
        this.clearTimeout();
    }

    error(): void {
        this.setState(ExecutionState.ERROR);
        this.clearTimeout();
    }

    // ========================================
    // Timeout Management
    // ========================================

    private setTimeout(ms: number): void {
        this.clearTimeout();
        this.timeoutId = setTimeout(() => {
            this.setState(ExecutionState.ABORTED);
            this.aborted = true;
            this.eventEmitter?.onTimeout?.(this.runContext);
            this.eventEmitter?.onAbort?.(this.runContext); // Timeout is implicitly an abort
        }, ms);
    }

    private clearTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
    }

    getElapsedTime(): number {
        if (!this.startTime) return 0;
        return Date.now() - this.startTime;
    }

    // ========================================
    // Checkpoint Management
    // ========================================

    setCurrentStep(stepId: string): void {
        this.currentStepId = stepId;
    }

    pushBlockFrame(frame: BlockStackFrame): void {
        this.blockStack.push(frame);
    }

    popBlockFrame(): BlockStackFrame | undefined {
        return this.blockStack.pop();
    }

    /**
     * 현재 실행 상태의 스냅샷 생성
     */
    createSnapshot(ctx: ExecutionContext, label?: string): ExecutionSnapshot {
        const snapshot: ExecutionSnapshot = {
            snapshotId: label ?? `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            runId: this.runId ?? "unknown",
            timestamp: Date.now(),
            state: this._state,
            currentStepId: this.currentStepId,
            context: ctx.toJSON(),
            blockStack: JSON.parse(JSON.stringify(this.blockStack)),
        };

        this.snapshots.push(snapshot);

        // 최대 스냅샷 개수 제한
        const maxSnapshots = this.options.maxSnapshots ?? 10;
        if (this.snapshots.length > maxSnapshots) {
            this.snapshots.shift(); // 가장 오래된 것 제거
        }

        return snapshot;
    }

    /**
     * 스냅샷에서 ExecutionContext 복원
     */
    restoreSnapshot(snapshot: ExecutionSnapshot): ExecutionContext {
        const ctx = new ExecutionContext({
            runId: snapshot.runId,
        });

        // 컨텍스트 복원
        for (const [key, value] of Object.entries(snapshot.context)) {
            ctx.set(key, value);
        }

        // 블록 스택 복원
        this.blockStack = JSON.parse(JSON.stringify(snapshot.blockStack));
        this.currentStepId = snapshot.currentStepId;

        return ctx;
    }

    /**
     * 모든 스냅샷 조회
     */
    getSnapshots(): ExecutionSnapshot[] {
        return [...this.snapshots];
    }

    /**
     * 특정 ID의 스냅샷 조회
     */
    getSnapshot(snapshotId: string): ExecutionSnapshot | undefined {
        return this.snapshots.find((s) => s.snapshotId === snapshotId);
    }

    /**
     * 가장 최근 스냅샷 조회
     */
    getLastSnapshot(): ExecutionSnapshot | undefined {
        return this.snapshots[this.snapshots.length - 1];
    }

    /**
     * 모든 스냅샷 삭제
     */
    clearSnapshots(): void {
        this.snapshots = [];
    }

    /**
     * 자동 체크포인트 활성화 여부
     */
    shouldAutoCheckpoint(): boolean {
        return this.options.autoCheckpoint ?? false;
    }

    // ========================================
    // Utility
    // ========================================

    reset(): void {
        this._state = ExecutionState.IDLE;
        this.aborted = false;
        this.pausePromise = undefined;
        this.pauseResolve = undefined;
        this.clearTimeout();
        this.blockStack = [];
        this.currentStepId = undefined;
        this.startTime = undefined;
    }

    getStatus(): {
        state: ExecutionState;
        runId?: string;
        currentStepId?: string;
        elapsedTime: number;
        snapshotCount: number;
    } {
        return {
            state: this._state,
            runId: this.runId,
            currentStepId: this.currentStepId,
            elapsedTime: this.getElapsedTime(),
            snapshotCount: this.snapshots.length,
        };
    }
}
