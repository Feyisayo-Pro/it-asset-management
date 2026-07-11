import { AssetStatus } from '../value-objects/asset-status';

export interface AssetStatusHistoryProps {
  id: string;
  assetId: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus;
  changedByUserId: string | null;
  reason: string | null;
  occurredAt: Date;
}

export class AssetStatusHistory {
  private constructor(private props: AssetStatusHistoryProps) {}

  static hydrate(props: AssetStatusHistoryProps): AssetStatusHistory {
    return new AssetStatusHistory(props);
  }

  static append(input: {
    id: string;
    assetId: string;
    fromStatus: AssetStatus | null;
    toStatus: AssetStatus;
    changedByUserId: string | null;
    reason: string | null;
    occurredAt?: Date;
  }): AssetStatusHistory {
    return new AssetStatusHistory({
      ...input,
      occurredAt: input.occurredAt ?? new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get assetId(): string { return this.props.assetId; }
  get fromStatus(): AssetStatus | null { return this.props.fromStatus; }
  get toStatus(): AssetStatus { return this.props.toStatus; }
  get changedByUserId(): string | null { return this.props.changedByUserId; }
  get reason(): string | null { return this.props.reason; }
  get occurredAt(): Date { return this.props.occurredAt; }

  toPersistence(): AssetStatusHistoryProps {
    return { ...this.props };
  }
}
