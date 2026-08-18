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
  static readonly PATTERN = /^AST-(\d{4})-(\d{5,})$/;

  static build(year: number, sequence: number): string {
    if (sequence < 1) throw new Error('sequence must be ≥ 1');
    const seq = String(sequence).padStart(5, '0');
    return `${this.PREFIX}-${year}-${seq}`;
  }

  /**
   * Given an existing tag, returns the parsed year and sequence, or
   * null if it doesn't match the canonical format.
   */
  static parse(tag: string): { year: number; sequence: number } | null {
    const match = this.PATTERN.exec(tag);
    if (!match) return null;
    return { year: Number(match[1]), sequence: Number(match[2]) };
  }

  /**
   * Strict format check for manually supplied or imported tags —
   * every entry point that accepts a caller-supplied tag must call
   * this before persisting it.
   */
  static isValid(tag: string): boolean {
    return this.PATTERN.test(tag);
  }
}
