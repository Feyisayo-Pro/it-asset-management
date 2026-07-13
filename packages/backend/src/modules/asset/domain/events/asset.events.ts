import { DomainEvent } from '../../../../common/events/base-event';
import { AssetStatus } from '../value-objects/asset-status';

export class AssetRegisteredEvent extends DomainEvent<{
  id: string;
  assetTag: string;
  serialNumber: string;
  registeredByUserId: string | null;
}> {
  readonly name = 'asset.registered';
}

export class AssetUpdatedEvent extends DomainEvent<{
  id: string;
  changedFields: string[];
  updatedByUserId: string | null;
}> {
  readonly name = 'asset.updated';
}

export class AssetDeletedEvent extends DomainEvent<{
  id: string;
  assetTag: string;
  deletedByUserId: string | null;
}> {
  readonly name = 'asset.deleted';
}

export class AssetStatusChangedEvent extends DomainEvent<{
  id: string;
  from: AssetStatus | null;
  to: AssetStatus;
  reason: string | null;
  changedByUserId: string | null;
}> {
  readonly name = 'asset.status-changed';
}

export class AssetBulkImportedEvent extends DomainEvent<{
  count: number;
  importedByUserId: string | null;
}> {
  readonly name = 'asset.bulk-imported';
}
