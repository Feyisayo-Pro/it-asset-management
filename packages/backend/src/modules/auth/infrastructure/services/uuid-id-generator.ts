import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IdGenerator } from '../../application/ports/id-generator.port';

@Injectable()
export class UuidIdGenerator implements IdGenerator {
  next(): string {
    return uuidv4();
  }
}
