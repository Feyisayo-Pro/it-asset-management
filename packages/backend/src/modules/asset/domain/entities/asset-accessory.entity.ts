export interface AssetAccessoryProps {
  id: string;
  assetId: string;
  name: string;
  quantity: number;
  notes: string | null;
}

export class AssetAccessory {
  private constructor(private props: AssetAccessoryProps) {}

  static hydrate(props: AssetAccessoryProps): AssetAccessory {
    return new AssetAccessory(props);
  }

  static create(input: {
    id: string;
    assetId: string;
    name: string;
    quantity?: number;
    notes?: string | null;
  }): AssetAccessory {
    if ((input.quantity ?? 1) < 1) {
      throw new Error('AssetAccessory quantity must be ≥ 1');
    }
    return new AssetAccessory({
      id: input.id,
      assetId: input.assetId,
      name: input.name.trim(),
      quantity: input.quantity ?? 1,
      notes: input.notes ?? null,
    });
  }

  get id(): string { return this.props.id; }
  get assetId(): string { return this.props.assetId; }
  get name(): string { return this.props.name; }
  get quantity(): number { return this.props.quantity; }
  get notes(): string | null { return this.props.notes; }

  toPersistence(): AssetAccessoryProps {
    return { ...this.props };
  }
}
