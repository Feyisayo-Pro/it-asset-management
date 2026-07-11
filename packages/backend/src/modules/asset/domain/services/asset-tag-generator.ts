/**
 * AssetTagGenerator — deterministic-format asset tag generator.
 * Format: {prefix}-{yyyy}-{seq zero-padded to 5}.
 * Example: AST-2026-00042.
 *
 * The generator is stateless; the caller supplies the next sequence
 * number (typically pulled from a DB sequence or MAX+1 lookup). This
 * keeps the domain layer free of side-effects.
 */
export class AssetTagGenerator {
  static readonly PREFIX = 'AST';

  static build(year: number, sequence: number): string {
    if (sequence < 1) throw new Error('sequence must be ≥ 1');
    const seq = String(sequence).padStart(5, '0');
    return `${this.PREFIX}-${year}-${seq}`;
  }

  /**
   * Given an existing tag in the correct format, returns the parsed
   * year and sequence. Returns null for foreign formats (e.g. legacy
   * import tags) so those are just accepted verbatim.
   */
  static parse(tag: string): { year: number; sequence: number } | null {
    const match = /^AST-(\d{4})-(\d{5,})$/.exec(tag);
    if (!match) return null;
    return { year: Number(match[1]), sequence: Number(match[2]) };
  }
}
