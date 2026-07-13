import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../application/ports/password-hasher.port';
import { ID_GENERATOR, IdGenerator } from '../../application/ports/id-generator.port';
import { User } from '../../domain/entities/user.entity';
import { RbacService } from '../../../rbac/application/rbac.service';
import { RoleName } from '../../../rbac/domain/enums/role-name.enum';
import { RootConfig } from '../../../../config/configuration';

/**
 * On first boot, if the users table is empty AND
 * BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD are set, creates
 * a Super Admin so the system is reachable without a manual seed.
 * A no-op on every subsequent boot.
 */
@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger('BootstrapAdmin');

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    private readonly rbac: RbacService,
    private readonly config: ConfigService<RootConfig, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const boot = this.config.getOrThrow<RootConfig['bootstrap']>('bootstrap');
    if (!boot.adminEmail || !boot.adminPassword) return;
    const existing = await this.users.countAll();
    if (existing > 0) return;

    const role = await this.rbac.roleByName(RoleName.SUPER_ADMIN);
    if (!role) {
      this.logger.warn('SUPER_ADMIN role missing; skipping bootstrap');
      return;
    }

    const hash = await this.hasher.hash(boot.adminPassword);
    const user = User.create({
      id: this.ids.next(),
      email: boot.adminEmail,
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: hash,
      roleId: role.id,
      mustChangePassword: true,
    });
    await this.users.save(user);
    this.logger.log(`Bootstrapped Super Admin: ${boot.adminEmail}`);
  }
}
