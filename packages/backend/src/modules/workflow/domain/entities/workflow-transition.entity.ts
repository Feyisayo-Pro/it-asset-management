export interface WorkflowInstanceTransitionProps {
  id: string;
  instanceId: string;
  fromState: string;
  toState: string;
  actionName: string;
  actorUserId: string | null;
  occurredAt: Date;
  signatureName: string | null;
  signatureIp: string | null;
  evidenceFileIds: string[] | null;
  comment: string | null;
}

export class WorkflowInstanceTransition {
  private constructor(private props: WorkflowInstanceTransitionProps) {}

  static hydrate(props: WorkflowInstanceTransitionProps): WorkflowInstanceTransition {
    return new WorkflowInstanceTransition(props);
  }

  static record(input: Omit<WorkflowInstanceTransitionProps, 'occurredAt'> & { occurredAt?: Date }): WorkflowInstanceTransition {
    return new WorkflowInstanceTransition({
      ...input,
      occurredAt: input.occurredAt ?? new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get instanceId(): string { return this.props.instanceId; }
  get fromState(): string { return this.props.fromState; }
  get toState(): string { return this.props.toState; }
  get actionName(): string { return this.props.actionName; }
  get actorUserId(): string | null { return this.props.actorUserId; }
  get occurredAt(): Date { return this.props.occurredAt; }
  get signatureName(): string | null { return this.props.signatureName; }
  get signatureIp(): string | null { return this.props.signatureIp; }
  get evidenceFileIds(): string[] | null { return this.props.evidenceFileIds; }
  get comment(): string | null { return this.props.comment; }

  toPersistence(): WorkflowInstanceTransitionProps {
    return { ...this.props };
  }
}
