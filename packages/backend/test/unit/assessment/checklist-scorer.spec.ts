import { ChecklistScorer } from '../../../src/modules/assessment/domain/services/checklist-scorer';
import { buildStandardTemplate } from './fakes';

const template = buildStandardTemplate();
const all = (result: 'Pass' | 'NA') =>
  template.items.map((i) => ({ itemCode: i.code, result: result as 'Pass' }));

const withFails = (...codes: string[]) =>
  template.items.map((i) => ({
    itemCode: i.code,
    result: (codes.includes(i.code) ? 'Fail' : 'Pass') as 'Fail' | 'Pass',
  }));

describe('ChecklistScorer', () => {
  it('suggests NoFaultFound when nothing failed', () => {
    expect(ChecklistScorer.suggest(template, all('Pass'))).toBe('NoFaultFound');
  });

  it('suggests ReplacementRecommended when the device does not power on', () => {
    expect(ChecklistScorer.suggest(template, withFails('device_powers_on'))).toBe(
      'ReplacementRecommended',
    );
  });

  it('suggests ReplacementRecommended on condition failures', () => {
    expect(ChecklistScorer.suggest(template, withFails('no_water_damage'))).toBe(
      'ReplacementRecommended',
    );
  });

  it('suggests ReplacementRecommended on 2+ hardware failures', () => {
    expect(
      ChecklistScorer.suggest(template, withFails('screen_intact', 'keyboard_functional')),
    ).toBe('ReplacementRecommended');
  });

  it('suggests RepairRecommended on an isolated hardware/software failure', () => {
    expect(ChecklistScorer.suggest(template, withFails('charger_available'))).toBe(
      'RepairRecommended',
    );
    expect(ChecklistScorer.suggest(template, withFails('os_functional'))).toBe(
      'RepairRecommended',
    );
  });
});
