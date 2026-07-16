import { Controller, Get } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Public } from '../decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  @Get()
  @Public()
  async check() {
    let dbStatus = 'ok';
    try {
      await this.em.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    };
  }

  @Get('live')
  @Public()
  liveness() {
    return { status: 'ok' };
  }
}
