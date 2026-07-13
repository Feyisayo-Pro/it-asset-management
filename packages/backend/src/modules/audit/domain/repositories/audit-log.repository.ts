import { AuditLogEntry } from '../entities/audit-log-entry.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditQueryParams {
  page: number;
  pageSize: number;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface AuditQueryResult {
  data: AuditLogEntry[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Write side is deliberately narrow: only append() is exposed. There
 * is no update/delete method — anything upstream that tries to mutate
 * an existing audit row will fail at compile time.
 */
export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
  query(params: AuditQueryParams): Promise<AuditQueryResult>;
  findById(id: string): Promise<AuditLogEntry | null>;
}
