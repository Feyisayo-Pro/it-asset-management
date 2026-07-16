import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  DashboardFilters,
  UserContext,
  DashboardKpis,
  DashboardCharts,
  DashboardWidgets,
  EnterpriseDashboardData,
  ChartDataPoint,
  TrendDataPoint,
  ActivityItem,
  NotificationWidgetItem,
  PendingTaskItem,
  WarrantyExpirationItem,
  RepairWidgetItem,
  RecentAssetItem,
} from '../presentation/dto/dashboard.dtos';

@Injectable()
export class EnterpriseDashboardService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async getDashboard(
    filters: DashboardFilters,
    user: UserContext,
  ): Promise<EnterpriseDashboardData> {
    const [kpis, charts, widgets, filterOptions] = await Promise.all([
      this.getKpis(filters, user),
      this.getCharts(filters, user),
      this.getWidgets(user),
      this.getFilterOptions(),
    ]);

    return {
      kpis,
      charts,
      widgets,
      filterOptions,
      role: user.roleName,
      generatedAt: new Date().toISOString(),
    };
  }

  async getKpis(
    filters: DashboardFilters,
    user: UserContext,
  ): Promise<DashboardKpis> {
    const isEmployee = user.roleName === 'EMPLOYEE';
    const { where, params } = this.buildAssetWhere(filters, user);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [assetCounts, pendingRequests, pendingApprovals] = await Promise.all([
      this.em.query(
        `SELECT
          COUNT(*)::int AS "totalAssets",
          COUNT(*) FILTER (WHERE a."status" = 'Available')::int AS available,
          COUNT(*) FILTER (WHERE a."status" = 'Allocated')::int AS allocated,
          COUNT(*) FILTER (WHERE a."status" = 'UnderRepair')::int AS "underRepair",
          COUNT(*) FILTER (WHERE a."status" = 'Returned')::int AS returned,
          COUNT(*) FILTER (WHERE a."status" = 'Disposed')::int AS disposed,
          COUNT(*) FILTER (WHERE a."status" = 'Lost')::int AS lost,
          COUNT(*) FILTER (WHERE a."status" = 'Stolen')::int AS stolen
         FROM "assets" a ${whereClause}`,
        params,
      ),
      this.countPendingRequests(user),
      this.countPendingApprovals(user),
    ]);

    const row = assetCounts[0] ?? {};
    return {
      totalAssets: row.totalAssets ?? 0,
      available: row.available ?? 0,
      allocated: row.allocated ?? 0,
      underRepair: row.underRepair ?? 0,
      returned: row.returned ?? 0,
      disposed: row.disposed ?? 0,
      lost: row.lost ?? 0,
      stolen: row.stolen ?? 0,
      pendingRequests: pendingRequests,
      pendingApprovals: isEmployee ? 0 : pendingApprovals,
    };
  }

  async getCharts(
    filters: DashboardFilters,
    user: UserContext,
  ): Promise<DashboardCharts> {
    const isEmployee = user.roleName === 'EMPLOYEE';
    if (isEmployee) {
      return {
        assetsByDepartment: [],
        assetsByBrand: [],
        assetsByType: [],
        allocationTrends: [],
        returnTrends: [],
        repairTrends: [],
        compliancePerformance: [],
      };
    }

    const [
      assetsByDepartment,
      assetsByBrand,
      assetsByType,
      allocationTrends,
      returnTrends,
      repairTrends,
      compliancePerformance,
    ] = await Promise.all([
      this.chartAssetsByDepartment(filters),
      this.chartAssetsByBrand(filters),
      this.chartAssetsByType(filters),
      this.chartAllocationTrends(filters),
      this.chartReturnTrends(filters),
      this.chartRepairTrends(filters),
      this.chartCompliance(filters),
    ]);

    return {
      assetsByDepartment,
      assetsByBrand,
      assetsByType,
      allocationTrends,
      returnTrends,
      repairTrends,
      compliancePerformance,
    };
  }

  async getWidgets(user: UserContext): Promise<DashboardWidgets> {
    const isEmployee = user.roleName === 'EMPLOYEE';

    const [
      recentActivity,
      notifications,
      pendingTasks,
      upcomingWarrantyExpirations,
      recentRepairs,
      recentlyAddedAssets,
    ] = await Promise.all([
      isEmployee ? Promise.resolve([]) : this.widgetRecentActivity(),
      this.widgetNotifications(user.userId),
      this.widgetPendingTasks(user),
      isEmployee ? Promise.resolve([]) : this.widgetWarrantyExpirations(),
      isEmployee ? Promise.resolve([]) : this.widgetRecentRepairs(),
      isEmployee ? Promise.resolve([]) : this.widgetRecentlyAddedAssets(),
    ]);

    return {
      recentActivity,
      notifications,
      pendingTasks,
      upcomingWarrantyExpirations,
      recentRepairs,
      recentlyAddedAssets,
    };
  }

  async getFilterOptions(): Promise<{
    departments: string[];
    offices: string[];
    assetTypes: string[];
  }> {
    const [deptRows, officeRows, typeRows] = await Promise.all([
      this.em.query(
        `SELECT DISTINCT "department" AS val FROM "assets" WHERE "department" IS NOT NULL ORDER BY "department"`,
      ),
      this.em.query(
        `SELECT DISTINCT "office_location" AS val FROM "assets" WHERE "office_location" IS NOT NULL ORDER BY "office_location"`,
      ),
      this.em.query(
        `SELECT DISTINCT "device_type" AS val FROM "assets" WHERE "device_type" IS NOT NULL ORDER BY "device_type"`,
      ),
    ]);

    return {
      departments: deptRows.map((r: { val: string }) => r.val),
      offices: officeRows.map((r: { val: string }) => r.val),
      assetTypes: typeRows.map((r: { val: string }) => r.val),
    };
  }

  // ── KPI helpers ──────────────────────────────────────────────

  private async countPendingRequests(user: UserContext): Promise<number> {
    const isEmployee = user.roleName === 'EMPLOYEE';
    const where = [`wi."completed_at" IS NULL`];
    const params: unknown[] = [];

    if (isEmployee) {
      params.push(user.userId);
      where.push(`wi."started_by_user_id" = $${params.length}`);
    }

    const rows: Array<{ count: number }> = await this.em.query(
      `SELECT COUNT(*)::int AS count FROM "workflow_instances" wi WHERE ${where.join(' AND ')}`,
      params,
    );
    return rows[0]?.count ?? 0;
  }

  private async countPendingApprovals(user: UserContext): Promise<number> {
    const where = [`wi."completed_at" IS NULL`];
    const params: unknown[] = [];

    if (user.roleName !== 'SUPER_ADMIN') {
      params.push(user.roleName);
      where.push(`ws."required_roles"::jsonb ? $${params.length}`);
    }

    const rows: Array<{ count: number }> = await this.em.query(
      `SELECT COUNT(*)::int AS count
       FROM "workflow_instances" wi
       JOIN "workflow_stages" ws
         ON ws."definition_id" = wi."definition_id"
         AND ws."state" = wi."current_state"
       WHERE ${where.join(' AND ')}`,
      params,
    );
    return rows[0]?.count ?? 0;
  }

  // ── Chart queries ────────────────────────────────────────────

  private async chartAssetsByDepartment(
    filters: DashboardFilters,
  ): Promise<ChartDataPoint[]> {
    const { where, params } = this.buildAssetWhereNoRole(filters);
    where.push(`a."status" NOT IN ('Disposed')`);
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const rows: Array<{ label: string; value: number }> = await this.em.query(
      `SELECT COALESCE(a."department", 'Unassigned') AS label, COUNT(*)::int AS value
       FROM "assets" a ${whereClause}
       GROUP BY label ORDER BY value DESC LIMIT 10`,
      params,
    );
    return rows;
  }

  private async chartAssetsByBrand(
    filters: DashboardFilters,
  ): Promise<ChartDataPoint[]> {
    const { where, params } = this.buildAssetWhereNoRole(filters);
    where.push(`a."status" NOT IN ('Disposed')`);
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const rows: Array<{ label: string; value: number }> = await this.em.query(
      `SELECT a."brand" AS label, COUNT(*)::int AS value
       FROM "assets" a ${whereClause}
       GROUP BY a."brand" ORDER BY value DESC LIMIT 10`,
      params,
    );
    return rows;
  }

  private async chartAssetsByType(
    filters: DashboardFilters,
  ): Promise<ChartDataPoint[]> {
    const { where, params } = this.buildAssetWhereNoRole(filters);
    where.push(`a."status" NOT IN ('Disposed')`);
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const rows: Array<{ label: string; value: number }> = await this.em.query(
      `SELECT a."device_type" AS label, COUNT(*)::int AS value
       FROM "assets" a ${whereClause}
       GROUP BY a."device_type" ORDER BY value DESC`,
      params,
    );
    return rows;
  }

  private async chartAllocationTrends(
    filters: DashboardFilters,
  ): Promise<TrendDataPoint[]> {
    const where = [
      `wd."key" = 'asset-allocation'`,
    ];
    const params: unknown[] = [];

    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`wi."created_at" >= $${params.length}`);
    } else {
      where.push(`wi."created_at" >= NOW() - INTERVAL '12 months'`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`wi."created_at" <= $${params.length}`);
    }

    const rows: Array<{ month: string; count: number }> = await this.em.query(
      `SELECT TO_CHAR(wi."created_at", 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM "workflow_instances" wi
       JOIN "workflow_definitions" wd ON wd."id" = wi."definition_id"
       WHERE ${where.join(' AND ')}
       GROUP BY month ORDER BY month`,
      params,
    );
    return rows;
  }

  private async chartReturnTrends(
    filters: DashboardFilters,
  ): Promise<TrendDataPoint[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`r."created_at" >= $${params.length}`);
    } else {
      where.push(`r."created_at" >= NOW() - INTERVAL '12 months'`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`r."created_at" <= $${params.length}`);
    }

    const rows: Array<{ month: string; count: number }> = await this.em.query(
      `SELECT TO_CHAR(r."created_at", 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM "return_records" r
       WHERE ${where.join(' AND ')}
       GROUP BY month ORDER BY month`,
      params,
    );
    return rows;
  }

  private async chartRepairTrends(
    filters: DashboardFilters,
  ): Promise<TrendDataPoint[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`rr."reported_at" >= $${params.length}`);
    } else {
      where.push(`rr."reported_at" >= NOW() - INTERVAL '12 months'`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`rr."reported_at" <= $${params.length}`);
    }

    const rows: Array<{ month: string; count: number }> = await this.em.query(
      `SELECT TO_CHAR(rr."reported_at", 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM "repair_records" rr
       WHERE ${where.join(' AND ')}
       GROUP BY month ORDER BY month`,
      params,
    );
    return rows;
  }

  private async chartCompliance(
    filters: DashboardFilters,
  ): Promise<ChartDataPoint[]> {
    const { where, params } = this.buildAssetWhereNoRole(filters);
    where.push(`a."status" NOT IN ('Disposed')`);
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const rows: Array<{
      expired: number;
      expiringSoon: number;
      valid: number;
      noWarranty: number;
    }> = await this.em.query(
      `SELECT
        COUNT(*) FILTER (WHERE a."warranty_expiry" IS NOT NULL AND a."warranty_expiry" < NOW())::int AS expired,
        COUNT(*) FILTER (WHERE a."warranty_expiry" IS NOT NULL AND a."warranty_expiry" BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS "expiringSoon",
        COUNT(*) FILTER (WHERE a."warranty_expiry" IS NOT NULL AND a."warranty_expiry" > NOW() + INTERVAL '30 days')::int AS valid,
        COUNT(*) FILTER (WHERE a."warranty_expiry" IS NULL)::int AS "noWarranty"
       FROM "assets" a ${whereClause}`,
      params,
    );

    const r = rows[0] ?? { expired: 0, expiringSoon: 0, valid: 0, noWarranty: 0 };
    return [
      { label: 'Expired', value: r.expired },
      { label: 'Expiring Soon', value: r.expiringSoon },
      { label: 'Valid', value: r.valid },
      { label: 'No Warranty', value: r.noWarranty },
    ];
  }

  // ── Widget queries ───────────────────────────────────────────

  private async widgetRecentActivity(): Promise<ActivityItem[]> {
    const rows: Array<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      first_name: string | null;
      last_name: string | null;
      occurred_at: string;
    }> = await this.em.query(
      `SELECT al."id", al."action", al."entity_type", al."entity_id",
              u."first_name", u."last_name",
              al."occurred_at"::text AS occurred_at
       FROM "audit_logs" al
       LEFT JOIN "users" u ON u."id" = al."user_id"
       ORDER BY al."occurred_at" DESC LIMIT 8`,
    );
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      userName: [r.first_name, r.last_name].filter(Boolean).join(' ') || 'System',
      occurredAt: r.occurred_at,
    }));
  }

  private async widgetNotifications(
    userId: string,
  ): Promise<NotificationWidgetItem[]> {
    const rows: Array<{
      id: string;
      event_type: string;
      subject: string;
      message: string;
      read: boolean;
      created_at: string;
    }> = await this.em.query(
      `SELECT "id", "event_type", "subject", "message", "read",
              "created_at"::text AS created_at
       FROM "notifications"
       WHERE "recipient_user_id" = $1
       ORDER BY "created_at" DESC LIMIT 5`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      subject: r.subject,
      message: r.message,
      read: r.read,
      createdAt: r.created_at,
    }));
  }

  private async widgetPendingTasks(
    user: UserContext,
  ): Promise<PendingTaskItem[]> {
    const isEmployee = user.roleName === 'EMPLOYEE';
    const where = [`wi."completed_at" IS NULL`];
    const params: unknown[] = [];

    if (isEmployee) {
      params.push(user.userId);
      where.push(`wi."started_by_user_id" = $${params.length}`);
    } else if (user.roleName !== 'SUPER_ADMIN') {
      params.push(user.roleName);
      where.push(`ws."required_roles"::jsonb ? $${params.length}`);
    }

    const joinStage =
      !isEmployee && user.roleName !== 'SUPER_ADMIN'
        ? `JOIN "workflow_stages" ws ON ws."definition_id" = wi."definition_id" AND ws."state" = wi."current_state"`
        : '';

    const rows: Array<{
      id: string;
      workflow_name: string;
      subject_type: string;
      subject_id: string;
      current_state: string;
      created_at: string;
    }> = await this.em.query(
      `SELECT wi."id", wd."name" AS workflow_name, wi."subject_type", wi."subject_id",
              wi."current_state", wi."created_at"::text AS created_at
       FROM "workflow_instances" wi
       JOIN "workflow_definitions" wd ON wd."id" = wi."definition_id"
       ${joinStage}
       WHERE ${where.join(' AND ')}
       ORDER BY wi."created_at" DESC LIMIT 8`,
      params,
    );
    return rows.map((r) => ({
      id: r.id,
      workflowName: r.workflow_name,
      subjectType: r.subject_type,
      subjectId: r.subject_id,
      currentState: r.current_state,
      createdAt: r.created_at,
    }));
  }

  private async widgetWarrantyExpirations(): Promise<WarrantyExpirationItem[]> {
    const rows: Array<{
      id: string;
      asset_tag: string;
      brand: string;
      model: string;
      device_type: string;
      warranty_expiry: string;
      days_remaining: number;
    }> = await this.em.query(
      `SELECT "id", "asset_tag", "brand", "model", "device_type",
              "warranty_expiry"::text AS warranty_expiry,
              EXTRACT(DAY FROM ("warranty_expiry"::timestamp - NOW()))::int AS days_remaining
       FROM "assets"
       WHERE "warranty_expiry" IS NOT NULL
         AND "warranty_expiry" BETWEEN NOW() AND NOW() + INTERVAL '90 days'
         AND "status" NOT IN ('Disposed')
       ORDER BY "warranty_expiry" ASC LIMIT 8`,
    );
    return rows.map((r) => ({
      id: r.id,
      assetTag: r.asset_tag,
      brand: r.brand,
      model: r.model,
      deviceType: r.device_type,
      warrantyExpiry: r.warranty_expiry,
      daysRemaining: r.days_remaining,
    }));
  }

  private async widgetRecentRepairs(): Promise<RepairWidgetItem[]> {
    const rows: Array<{
      id: string;
      asset_tag: string;
      brand: string;
      model: string;
      status: string;
      reported_fault: string;
      reported_at: string;
    }> = await this.em.query(
      `SELECT rr."id", a."asset_tag", a."brand", a."model",
              rr."status", rr."reported_fault",
              rr."reported_at"::text AS reported_at
       FROM "repair_records" rr
       JOIN "assets" a ON a."id" = rr."asset_id"
       ORDER BY rr."created_at" DESC LIMIT 8`,
    );
    return rows.map((r) => ({
      id: r.id,
      assetTag: r.asset_tag,
      brand: r.brand,
      model: r.model,
      status: r.status,
      reportedFault: r.reported_fault,
      reportedAt: r.reported_at,
    }));
  }

  private async widgetRecentlyAddedAssets(): Promise<RecentAssetItem[]> {
    const rows: Array<{
      id: string;
      asset_tag: string;
      brand: string;
      model: string;
      device_type: string;
      status: string;
      created_at: string;
    }> = await this.em.query(
      `SELECT "id", "asset_tag", "brand", "model", "device_type", "status",
              "created_at"::text AS created_at
       FROM "assets"
       ORDER BY "created_at" DESC LIMIT 8`,
    );
    return rows.map((r) => ({
      id: r.id,
      assetTag: r.asset_tag,
      brand: r.brand,
      model: r.model,
      deviceType: r.device_type,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  // ── Filter builder helpers ───────────────────────────────────

  private buildAssetWhere(
    filters: DashboardFilters,
    user: UserContext,
  ): { where: string[]; params: unknown[] } {
    const { where, params } = this.buildAssetWhereNoRole(filters);
    if (user.roleName === 'EMPLOYEE') {
      params.push(user.userId);
      where.push(`a."current_holder_id" = $${params.length}`);
    }
    return { where, params };
  }

  private buildAssetWhereNoRole(
    filters: DashboardFilters,
  ): { where: string[]; params: unknown[] } {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.department) {
      params.push(filters.department);
      where.push(`a."department" = $${params.length}`);
    }
    if (filters.office) {
      params.push(filters.office);
      where.push(`a."office_location" = $${params.length}`);
    }
    if (filters.assetType) {
      params.push(filters.assetType);
      where.push(`a."device_type" = $${params.length}`);
    }

    return { where, params };
  }
}
