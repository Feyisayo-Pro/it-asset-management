/**
 * Reasons an asset may be taken out of service. These map to the
 * business's Asset Movement Register categories — the label is stored
 * verbatim in the disposal record and shown throughout the UI/audit
 * trail, so adding one requires a migration + UI + audit lookup update.
 */
export const DisposalReason = {
  BeyondRepair: 'BeyondRepair',
  Obsolete: 'Obsolete',
  Lost: 'Lost',
  Sold: 'Sold',
  Donated: 'Donated',
  Damaged: 'Damaged',
} as const;
export type DisposalReason = (typeof DisposalReason)[keyof typeof DisposalReason];
export const ALL_DISPOSAL_REASONS: readonly DisposalReason[] =
  Object.values(DisposalReason);

/**
 * How the disposal was physically carried out. Kept separate from the
 * reason — an Obsolete asset can be Sold, Donated, or Destroyed.
 */
export const DisposalMethod = {
  EWasteRecycling: 'EWasteRecycling',
  Sold: 'Sold',
  Donated: 'Donated',
  Destroyed: 'Destroyed',
  ReturnedToVendor: 'ReturnedToVendor',
  Other: 'Other',
} as const;
export type DisposalMethod = (typeof DisposalMethod)[keyof typeof DisposalMethod];
export const ALL_DISPOSAL_METHODS: readonly DisposalMethod[] =
  Object.values(DisposalMethod);

/**
 * A disposal request moves Requested → (Approved | Rejected). Once
 * Approved the asset itself is flipped to AssetStatus.Disposed and the
 * request is terminal.
 */
export const DisposalStatus = {
  Requested: 'Requested',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;
export type DisposalStatus = (typeof DisposalStatus)[keyof typeof DisposalStatus];
export const ALL_DISPOSAL_STATUSES: readonly DisposalStatus[] =
  Object.values(DisposalStatus);

export const TERMINAL_DISPOSAL_STATUSES: readonly DisposalStatus[] = [
  DisposalStatus.Approved,
  DisposalStatus.Rejected,
];
