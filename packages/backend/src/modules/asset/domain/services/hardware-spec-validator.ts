export const CpuTier = {
  Entry: 'Entry', // i3 / Ryzen 3 equivalent
  Standard: 'Standard', // i5 / Ryzen 5 equivalent
  Performance: 'Performance', // i7/i9 / Ryzen 7 equivalent or better (incl. Apple Silicon MacBook Pro)
} as const;
export type CpuTier = (typeof CpuTier)[keyof typeof CpuTier];
export const ALL_CPU_TIERS: readonly CpuTier[] = Object.values(CpuTier);

const CPU_TIER_RANK: Record<CpuTier, number> = {
  [CpuTier.Entry]: 0,
  [CpuTier.Standard]: 1,
  [CpuTier.Performance]: 2,
};

/**
 * Job role level — the axis the client's real IT Hardware
 * Specifications Matrix is keyed on (docs/22-sapphire-virtual-source-data.md
 * §1), not department. The system has no persisted field for this
 * anywhere (User/Asset have no job-role/seniority column, and
 * RoleName is access-control, not job classification) — per the
 * matrix's own SOP A step 2 ("IT matches the job role against the IT
 * Hardware Specifications Matrix"), this is expected to be a value IT
 * selects at assessment time, not something read off a stored record.
 */
export const RoleLevel = {
  Operative: 'Operative',
  Officer: 'Officer',
  SeniorOfficer: 'SeniorOfficer',
  AssistantManager: 'AssistantManager',
  Manager: 'Manager',
  SeniorManager: 'SeniorManager',
  AssistantGeneralManager: 'AssistantGeneralManager',
  DeputyGeneralManager: 'DeputyGeneralManager',
  GeneralManager: 'GeneralManager',
  Director: 'Director',
} as const;
export type RoleLevel = (typeof RoleLevel)[keyof typeof RoleLevel];
export const ALL_ROLE_LEVELS: readonly RoleLevel[] = Object.values(RoleLevel);

export interface DeviceSpec {
  cpuTier: CpuTier;
  ramGb: number;
  storageGb: number;
}

export interface RoleLevelSpecRequirement {
  minCpuTier: CpuTier;
  minRamGb: number;
  minStorageGb: number;
}

/**
 * Source: docs/22-sapphire-virtual-source-data.md §1 (client-supplied
 * IT Hardware Specifications Matrix, 2026-08-18) — this is real,
 * client-approved data, not a placeholder. "i5 or Ryzen 5" /
 * "i5/i7 or Ryzen 5/7" both floor at Standard tier (the matrix states
 * a minimum, and i5/i7 phrasing means "i5 or better is acceptable",
 * not "must be exactly i5 or i7"). Director has no fixed minimum
 * ("Executive Custom Request") — modeled as `null`, meaning no
 * automated check applies; that tier is manually approved per the SOP.
 */
export const ROLE_LEVEL_SPEC_REQUIREMENTS: Readonly<
  Record<RoleLevel, RoleLevelSpecRequirement | null>
> = {
  Operative: { minCpuTier: CpuTier.Entry, minRamGb: 8, minStorageGb: 256 },
  Officer: { minCpuTier: CpuTier.Standard, minRamGb: 8, minStorageGb: 256 },
  SeniorOfficer: { minCpuTier: CpuTier.Standard, minRamGb: 8, minStorageGb: 256 },
  AssistantManager: { minCpuTier: CpuTier.Standard, minRamGb: 16, minStorageGb: 512 },
  Manager: { minCpuTier: CpuTier.Standard, minRamGb: 16, minStorageGb: 512 },
  SeniorManager: { minCpuTier: CpuTier.Standard, minRamGb: 16, minStorageGb: 512 },
  AssistantGeneralManager: { minCpuTier: CpuTier.Standard, minRamGb: 16, minStorageGb: 512 },
  DeputyGeneralManager: { minCpuTier: CpuTier.Standard, minRamGb: 16, minStorageGb: 512 },
  GeneralManager: { minCpuTier: CpuTier.Performance, minRamGb: 16, minStorageGb: 512 },
  Director: null,
};

export interface SpecEvaluationResult {
  meetsRequirement: boolean;
  /** null when the role level has no fixed requirement (Director) — not itself a failure. */
  requirement: RoleLevelSpecRequirement | null;
  /** Soft, non-blocking advisory messages — never throws. */
  warnings: string[];
}

/**
 * HardwareSpecValidator — compares a device's spec against a job role
 * level's minimum requirement (per the client's IT Hardware
 * Specifications Matrix) and returns soft warnings. Never throws and
 * never blocks a workflow; callers decide what to do with the
 * warnings (e.g. surface them as a non-blocking recommendation).
 */
export class HardwareSpecValidator {
  constructor(
    private readonly requirements: Readonly<
      Record<string, RoleLevelSpecRequirement | null>
    > = ROLE_LEVEL_SPEC_REQUIREMENTS,
  ) {}

  evaluate(roleLevel: string, spec: DeviceSpec): SpecEvaluationResult {
    const requirement = this.requirements[roleLevel] ?? null;
    if (!requirement) {
      return { meetsRequirement: true, requirement: null, warnings: [] };
    }

    const warnings: string[] = [];
    if (CPU_TIER_RANK[spec.cpuTier] < CPU_TIER_RANK[requirement.minCpuTier]) {
      warnings.push(
        `Selected device's CPU tier (${spec.cpuTier}) is below the ${roleLevel} role level's minimum (${requirement.minCpuTier}).`,
      );
    }
    if (spec.ramGb < requirement.minRamGb) {
      warnings.push(
        `Selected device has ${spec.ramGb}GB RAM, below the ${roleLevel} role level's minimum of ${requirement.minRamGb}GB.`,
      );
    }
    if (spec.storageGb < requirement.minStorageGb) {
      warnings.push(
        `Selected device has ${spec.storageGb}GB storage, below the ${roleLevel} role level's minimum of ${requirement.minStorageGb}GB.`,
      );
    }

    return { meetsRequirement: warnings.length === 0, requirement, warnings };
  }
}
