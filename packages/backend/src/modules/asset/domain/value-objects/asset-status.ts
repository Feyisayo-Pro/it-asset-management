export const AssetStatus = {
  Registration: 'Registration',
  Available: 'Available',
  Reserved: 'Reserved',
  Allocated: 'Allocated',
  Returned: 'Returned',
  UnderRepair: 'UnderRepair',
  Disposed: 'Disposed',
  Lost: 'Lost',
  Stolen: 'Stolen',
  Unaccounted: 'Unaccounted',
} as const;

export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const ALL_ASSET_STATUSES: readonly AssetStatus[] =
  Object.values(AssetStatus);

/**
 * Asset lifecycle transitions permitted by the domain state machine
 * (arch §8.6). Direct status writes outside the workflow use this
 * table via AssetLifecycleStateMachine.assertTransitionAllowed.
 * Disposed is terminal *except* via a Super Admin recovery back to
 * the pre-disposal status (handled specially in DisposalModule).
 */
const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  Registration: [AssetStatus.Available, AssetStatus.Unaccounted],
  Available: [
    AssetStatus.Reserved,
    AssetStatus.Allocated,
    AssetStatus.UnderRepair,
    AssetStatus.Disposed,
    AssetStatus.Lost,
    AssetStatus.Stolen,
    AssetStatus.Unaccounted,
  ],
  Reserved: [AssetStatus.Available, AssetStatus.Allocated],
  Allocated: [
    AssetStatus.Returned,
    AssetStatus.UnderRepair,
    AssetStatus.Lost,
    AssetStatus.Stolen,
  ],
  Returned: [AssetStatus.Available, AssetStatus.UnderRepair, AssetStatus.Disposed],
  UnderRepair: [AssetStatus.Available, AssetStatus.Disposed],
  Disposed: [],
  Lost: [AssetStatus.Available, AssetStatus.Unaccounted],
  Stolen: [AssetStatus.Available, AssetStatus.Unaccounted],
  Unaccounted: [AssetStatus.Available, AssetStatus.Lost, AssetStatus.Stolen],
};

export class AssetLifecycleStateMachine {
  static isTransitionAllowed(from: AssetStatus, to: AssetStatus): boolean {
    if (from === to) return true;
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static allowedNextStates(from: AssetStatus): AssetStatus[] {
    return TRANSITIONS[from] ?? [];
  }
}
