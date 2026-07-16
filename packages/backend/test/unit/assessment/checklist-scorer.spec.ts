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
  it('suggests Pass when nothing failed', () => {
    expect(ChecklistScorer.suggest(template, all('Pass'))).toBe('Pass');
  });

  it('suggests Reject when the device does not boot', () => {
    expect(ChecklistScorer.suggest(template, withFails('boots_successfully'))).toBe('Reject');
  });

  it('suggests ReplacementRecommended on condition failures', () => {
    expect(ChecklistScorer.suggest(template, withFails('water_damage'))).toBe(
      'ReplacementRecommended',
    );
  });

  it('suggests ReplacementRecommended on 3+ hardware failures', () => {
    expect(
      ChecklistScorer.suggest(template, withFails('screen', 'keyboard', 'battery')),
    ).toBe('ReplacementRecommended');
  });

  it('suggests RepairRecommended on isolated hardware/software failures', () => {
    expect(ChecklistScorer.suggest(template, withFails('battery'))).toBe('RepairRecommended');
    expect(ChecklistScorer.suggest(template, withFails('antivirus'))).toBe('RepairRecommended');
  });
});
