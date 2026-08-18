export interface WorkflowInstanceProps {
  id: string;
  definitionId: string;
  subjectType: string;
  subjectId: string;
  currentState: string;
  startedByUserId: string | null;
  startedAt: Date;
  currentStageEnteredAt: Date;
  completedAt: Date | null;
  bypassed: boolean;
  bypassedByUserId: string | null;
  bypassReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowInstance {
  private constructor(private props: WorkflowInstanceProps) {}

  static hydrate(props: WorkflowInstanceProps): WorkflowInstance {
    return new WorkflowInstance(props);
  }

  static start(input: {
    id: string;
    definitionId: string;
    subjectType: string;
    subjectId: string;
    initialState: string;
    startedByUserId: string | null;
    now?: Date;
  }): WorkflowInstance {
    const now = input.now ?? new Date();
    return new WorkflowInstance({
      id: input.id,
      definitionId: input.definitionId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      currentState: input.initialState,
      startedByUserId: input.startedByUserId,
      startedAt: now,
      currentStageEnteredAt: now,
      completedAt: null,
      bypassed: false,
      bypassedByUserId: null,
      bypassReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get definitionId(): string { return this.props.definitionId; }
  get subjectType(): string { return this.props.subjectType; }
  get subjectId(): string { return this.props.subjectId; }
  get currentState(): string { return this.props.currentState; }
  get startedByUserId(): string | null { return this.props.startedByUserId; }
  get startedAt(): Date { return this.props.startedAt; }
  get currentStageEnteredAt(): Date { return this.props.currentStageEnteredAt; }
  get completedAt(): Date | null { return this.props.completedAt; }
  get bypassed(): boolean { return this.props.bypassed; }
  get bypassedByUserId(): string | null { return this.props.bypassedByUserId; }
  get bypassReason(): string | null { return this.props.bypassReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isTerminated(): boolean {
    return this.props.completedAt !== null;
  }

  moveTo(nextState: string, now: Date, isFinal: boolean): void {
    if (this.isTerminated()) {
      throw new Error('Cannot transition an already-completed instance');
    }
    this.props.currentState = nextState;
    this.props.currentStageEnteredAt = now;
    this.props.updatedAt = now;
    if (isFinal) this.props.completedAt = now;
  }

  markBypassed(userId: string, reason: string, now: Date): void {
    this.props.bypassed = true;
    this.props.bypassedByUserId = userId;
    this.props.bypassReason = reason;
    this.props.updatedAt = now;
  }

  toPersistence(): WorkflowInstanceProps {
    return { ...this.props };
  }
}
