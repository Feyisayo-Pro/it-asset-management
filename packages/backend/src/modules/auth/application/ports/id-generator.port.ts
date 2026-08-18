export const ID_GENERATOR = Symbol('ID_GENERATOR');

/**
 * Wrapping UUID generation behind a port makes unit tests fully
 * deterministic — every use-case-produced id is the fake generator's
 * next value.
 */
export interface IdGenerator {
  next(): string;
}
