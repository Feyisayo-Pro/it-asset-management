export interface WorkflowStage {
  id: string;
  state: string;
  label: string;
  requiredRoles: string[];
  slaMinutes: number | null;
  sortOrder: number;
}

export interface WorkflowTransitionConfig {
  id: string;
  fromState: string;
  toState: string;
  actionName: string;
  requiredRoles: string[];
  requiresSignature: boolean;
  requiresEvidence: boolean;
  requiresComment: boolean;
  notificationRecipients: string[];
  auditAction: string;
}

export interface WorkflowDefinitionProps {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  initialState: string;
  finalStates: string[];
  stages: WorkflowStage[];
  transitions: WorkflowTransitionConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowDefinition {
  private constructor(private props: WorkflowDefinitionProps) {}

  static hydrate(props: WorkflowDefinitionProps): WorkflowDefinition {
    return new WorkflowDefinition(props);
  }

  static create(input: {
    id: string;
    key: string;
    version?: number;
    name: string;
    description?: string;
    initialState: string;
    finalStates: string[];
    stages: WorkflowStage[];
    transitions: WorkflowTransitionConfig[];
    now?: Date;
  }): WorkflowDefinition {
    if (!input.stages.some((s) => s.state === input.initialState)) {
      throw new Error(
        `initialState "${input.initialState}" has no matching stage`,
      );
    }
    for (const t of input.transitions) {
      if (!input.stages.some((s) => s.state === t.fromState)) {
        throw new Error(`Transition from unknown state "${t.fromState}"`);
      }
      if (!input.stages.some((s) => s.state === t.toState)) {
        throw new Error(`Transition to unknown state "${t.toState}"`);
      }
    }
    const now = input.now ?? new Date();
    return new WorkflowDefinition({
      id: input.id,
      key: input.key,
      version: input.version ?? 1,
      name: input.name,
      description: input.description ?? null,
      isActive: true,
      initialState: input.initialState,
      finalStates: input.finalStates,
      stages: input.stages,
      transitions: input.transitions,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get key(): string { return this.props.key; }
  get version(): number { return this.props.version; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }
  get initialState(): string { return this.props.initialState; }
  get finalStates(): string[] { return this.props.finalStates; }
  get stages(): WorkflowStage[] { return this.props.stages; }
  get transitions(): WorkflowTransitionConfig[] { return this.props.transitions; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  findStage(state: string): WorkflowStage | undefined {
    return this.props.stages.find((s) => s.state === state);
  }

  findTransition(fromState: string, actionName: string): WorkflowTransitionConfig | undefined {
    return this.props.transitions.find(
      (t) => t.fromState === fromState && t.actionName === actionName,
    );
  }

  isFinalState(state: string): boolean {
    return this.props.finalStates.includes(state);
  }

  toPersistence(): WorkflowDefinitionProps {
    return {
      ...this.props,
      stages: [...this.props.stages],
      transitions: [...this.props.transitions],
      finalStates: [...this.props.finalStates],
    };
  }
}
