export interface AuditLogEntryProps {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
  occurredAt: Date;
}

export class AuditLogEntry {
  private constructor(private props: AuditLogEntryProps) {}

  static hydrate(props: AuditLogEntryProps): AuditLogEntry {
    return new AuditLogEntry(props);
  }

  static append(input: Omit<AuditLogEntryProps, 'occurredAt'> & { occurredAt?: Date }): AuditLogEntry {
    return new AuditLogEntry({
      ...input,
      occurredAt: input.occurredAt ?? new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get userId(): string | null { return this.props.userId; }
  get action(): string { return this.props.action; }
  get entityType(): string { return this.props.entityType; }
  get entityId(): string | null { return this.props.entityId; }
  get oldValue(): Record<string, unknown> | null { return this.props.oldValue; }
  get newValue(): Record<string, unknown> | null { return this.props.newValue; }
  get ip(): string | null { return this.props.ip; }
  get userAgent(): string | null { return this.props.userAgent; }
  get correlationId(): string | null { return this.props.correlationId; }
  get occurredAt(): Date { return this.props.occurredAt; }

  toPersistence(): AuditLogEntryProps {
    return { ...this.props };
  }
}
