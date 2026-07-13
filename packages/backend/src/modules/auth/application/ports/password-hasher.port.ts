export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/**
 * PasswordHasher — abstracted so use cases don't depend on argon2 /
 * bcrypt directly; enables in-memory hasher in unit tests.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
