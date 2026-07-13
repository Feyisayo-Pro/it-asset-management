import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  private static readonly OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65_536, // 64 MiB
    timeCost: 3,
    parallelism: 4,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, Argon2PasswordHasher.OPTIONS);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
