import { HardwareSpecValidator } from '../../../src/modules/asset/domain/services/hardware-spec-validator';

describe('HardwareSpecValidator', () => {
  const requirements = {
    Officer: { minCpuTier: 'Standard', minRamGb: 8, minStorageGb: 256 } as const,
    Manager: { minCpuTier: 'Standard', minRamGb: 16, minStorageGb: 512 } as const,
    GeneralManager: { minCpuTier: 'Performance', minRamGb: 16, minStorageGb: 512 } as const,
    Director: null,
  };

  it('flags a CPU tier below the role level minimum', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Manager', { cpuTier: 'Entry', ramGb: 16, storageGb: 512 });
    expect(result.meetsRequirement).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('CPU tier');
  });

  it('flags RAM below the role level minimum', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Manager', { cpuTier: 'Standard', ramGb: 8, storageGb: 512 });
    expect(result.meetsRequirement).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('RAM');
  });

  it('flags storage below the role level minimum', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Manager', { cpuTier: 'Standard', ramGb: 16, storageGb: 256 });
    expect(result.meetsRequirement).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('storage');
  });

  it('flags all three dimensions independently when all are under-spec', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Manager', { cpuTier: 'Entry', ramGb: 4, storageGb: 128 });
    expect(result.warnings).toHaveLength(3);
  });

  it('passes a device that meets or exceeds the minimum', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Manager', { cpuTier: 'Performance', ramGb: 16, storageGb: 512 });
    expect(result.meetsRequirement).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('is a no-op (no warnings, not a failure) for a role level with no configured requirement', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Unknown Role', { cpuTier: 'Entry', ramGb: 2, storageGb: 64 });
    expect(result.meetsRequirement).toBe(true);
    expect(result.requirement).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it('is a no-op for Director — Executive Custom Request has no fixed minimum', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Director', { cpuTier: 'Entry', ramGb: 2, storageGb: 64 });
    expect(result.meetsRequirement).toBe(true);
    expect(result.requirement).toBeNull();
  });

  it('respects a lower bar at a lower role level (Officer requires only Standard/8GB/256GB)', () => {
    const validator = new HardwareSpecValidator(requirements);
    const result = validator.evaluate('Officer', { cpuTier: 'Standard', ramGb: 8, storageGb: 256 });
    expect(result.meetsRequirement).toBe(true);
  });

  it('uses the real client matrix as the default requirement table when none is supplied', () => {
    const validator = new HardwareSpecValidator();
    const result = validator.evaluate('Manager', { cpuTier: 'Entry', ramGb: 4, storageGb: 128 });
    expect(result.meetsRequirement).toBe(false);
  });
});
