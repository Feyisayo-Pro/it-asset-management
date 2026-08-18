import {
  AssetLifecycleStateMachine,
  AssetStatus,
} from '../value-objects/asset-status';
import {
  InvalidAssetStatusTransitionError,
  WarrantyBeforePurchaseError,
} from '../../../../common/errors/asset.errors';

export interface AssetProps {
  id: string;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  imei: string | null;
  purchaseDate: Date | null;
  purchaseAmountCents: number | null;
  purchaseCurrency: string;
  vendor: string | null;
  warrantyExpiry: Date | null;
  officeLocation: string | null;
  department: string | null;
  currentHolderId: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Asset aggregate root. All lifecycle mutations go through methods on
 * this class so invariants are enforced regardless of the caller.
 */
export class Asset {
  private constructor(private props: AssetProps) {}

  static hydrate(props: AssetProps): Asset {
    return new Asset(props);
  }

  static register(input: {
    id: string;
    assetTag: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber: string;
    imei?: string | null;
    purchaseDate?: Date | null;
    purchaseAmountCents?: number | null;
    purchaseCurrency?: string;
    vendor?: string | null;
    warrantyExpiry?: Date | null;
    officeLocation?: string | null;
    department?: string | null;
    notes?: string | null;
    now?: Date;
  }): Asset {
    const now = input.now ?? new Date();
    if (
      input.warrantyExpiry &&
      input.purchaseDate &&
      input.warrantyExpiry < input.purchaseDate
    ) {
      throw new WarrantyBeforePurchaseError();
    }
    return new Asset({
      id: input.id,
      assetTag: input.assetTag.trim().toUpperCase(),
      deviceType: input.deviceType.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      serialNumber: input.serialNumber.trim(),
      imei: input.imei?.trim() || null,
      purchaseDate: input.purchaseDate ?? null,
      purchaseAmountCents: input.purchaseAmountCents ?? null,
      purchaseCurrency: (input.purchaseCurrency ?? 'USD').toUpperCase(),
      vendor: input.vendor?.trim() || null,
      warrantyExpiry: input.warrantyExpiry ?? null,
      officeLocation: input.officeLocation?.trim() || null,
      department: input.department?.trim() || null,
      currentHolderId: null,
      status: AssetStatus.Registration,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get assetTag(): string { return this.props.assetTag; }
  get deviceType(): string { return this.props.deviceType; }
  get brand(): string { return this.props.brand; }
  get model(): string { return this.props.model; }
  get serialNumber(): string { return this.props.serialNumber; }
  get imei(): string | null { return this.props.imei; }
  get purchaseDate(): Date | null { return this.props.purchaseDate; }
  get purchaseAmountCents(): number | null { return this.props.purchaseAmountCents; }
  get purchaseCurrency(): string { return this.props.purchaseCurrency; }
  get vendor(): string | null { return this.props.vendor; }
  get warrantyExpiry(): Date | null { return this.props.warrantyExpiry; }
  get officeLocation(): string | null { return this.props.officeLocation; }
  get department(): string | null { return this.props.department; }
  get currentHolderId(): string | null { return this.props.currentHolderId; }
  get status(): AssetStatus { return this.props.status; }
  get notes(): string | null { return this.props.notes; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(
    patch: Partial<
      Pick<
        AssetProps,
        | 'deviceType'
        | 'brand'
        | 'model'
        | 'imei'
        | 'purchaseDate'
        | 'purchaseAmountCents'
        | 'purchaseCurrency'
        | 'vendor'
        | 'warrantyExpiry'
        | 'officeLocation'
        | 'department'
        | 'notes'
      >
    >,
    now: Date,
  ): void {
    const nextPurchaseDate =
      patch.purchaseDate !== undefined ? patch.purchaseDate : this.props.purchaseDate;
    const nextWarrantyExpiry =
      patch.warrantyExpiry !== undefined
        ? patch.warrantyExpiry
        : this.props.warrantyExpiry;
    if (
      nextWarrantyExpiry &&
      nextPurchaseDate &&
      nextWarrantyExpiry < nextPurchaseDate
    ) {
      throw new WarrantyBeforePurchaseError();
    }
    Object.assign(this.props, patch);
    this.props.updatedAt = now;
  }

  changeStatus(to: AssetStatus, now: Date, holderId?: string | null): void {
    if (!AssetLifecycleStateMachine.isTransitionAllowed(this.props.status, to)) {
      throw new InvalidAssetStatusTransitionError(this.props.status, to);
    }
    this.props.status = to;
    if (holderId !== undefined) this.props.currentHolderId = holderId;
    this.props.updatedAt = now;
  }

  toPersistence(): AssetProps {
    return { ...this.props };
  }
}
