import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  assetType?: string;
  brand?: string;
  employeeUserId?: string;
  status?: string;
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async inventoryReport(filters: ReportFilters) {
    const where: string[] = [];
    const params: unknown[] = [];
    this.applyAssetFilters(where, params, filters);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const summary: Array<{ status: string; count: string }> = await this.em.query(
      `SELECT a."status", COUNT(*)::text AS count FROM "assets" a ${whereClause} GROUP BY a."status" ORDER BY count DESC`,
      params,
    );
    const byType: Array<{ asset_type: string; count: string }> = await this.em.query(
      `SELECT a."asset_type" AS asset_type, COUNT(*)::text AS count FROM "assets" a ${whereClause} GROUP BY a."asset_type" ORDER BY count DESC`,
      params,
    );
    const byBrand: Array<{ brand: string; count: string }> = await this.em.query(
      `SELECT a."brand", COUNT(*)::text AS count FROM "assets" a ${whereClause} GROUP BY a."brand" ORDER BY count DESC`,
      params,
    );
    const total = summary.reduce((s, r) => s + parseInt(r.count, 10), 0);

    return {
      reportType: 'inventory',
      generatedAt: new Date().toISOString(),
      total,
      byStatus: summary.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      byType: byType.map((r) => ({ assetType: r.asset_type, count: parseInt(r.count, 10) })),
      byBrand: byBrand.map((r) => ({ brand: r.brand, count: parseInt(r.count, 10) })),
    };
  }

  async allocationReport(filters: ReportFilters) {
    const where = [`wi."definition_key" = 'asset-allocation'`];
    const params: unknown[] = [];
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`wi."created_at" >= $${params.length}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`wi."created_at" <= $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`wi."current_state" = $${params.length}`);
    }

    const rows: Array<{
      month: string; total: string; approved: string; rejected: string;
    }> = await this.em.query(
      `SELECT
        TO_CHAR(wi."created_at", 'YYYY-MM') AS month,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE wi."current_state" ILIKE '%approved%' OR wi."current_state" ILIKE '%complete%')::text AS approved,
        COUNT(*) FILTER (WHERE wi."current_state" ILIKE '%rejected%')::text AS rejected
       FROM "workflow_instances" wi
       WHERE ${where.join(' AND ')}
       GROUP BY month ORDER BY month DESC`,
      params,
    );
    return {
      reportType: 'allocation',
      generatedAt: new Date().toISOString(),
      monthly: rows.map((r) => ({
        month: r.month,
        total: parseInt(r.total, 10),
        approved: parseInt(r.approved, 10),
        rejected: parseInt(r.rejected, 10),
      })),
    };
  }

  async returnsReport(filters: ReportFilters) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`r."created_at" >= $${params.length}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`r."created_at" <= $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`r."status" = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const monthly: Array<{ month: string; count: string }> = await this.em.query(
      `SELECT TO_CHAR(r."created_at", 'YYYY-MM') AS month, COUNT(*)::text AS count
       FROM "return_records" r ${whereClause}
       GROUP BY month ORDER BY month DESC`,
      params,
    );
    const byReason: Array<{ reason: string; count: string }> = await this.em.query(
      `SELECT r."reason", COUNT(*)::text AS count
       FROM "return_records" r ${whereClause}
       GROUP BY r."reason" ORDER BY count DESC`,
      params,
    );
    return {
      reportType: 'returns',
      generatedAt: new Date().toISOString(),
      monthly: monthly.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
      byReason: byReason.map((r) => ({ reason: r.reason, count: parseInt(r.count, 10) })),
    };
  }

  async repairsReport(filters: ReportFilters) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`rr."reported_at" >= $${params.length}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`rr."reported_at" <= $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`rr."status" = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const byStatus: Array<{ status: string; count: string }> = await this.em.query(
      `SELECT rr."status", COUNT(*)::text AS count
       FROM "repair_records" rr ${whereClause}
       GROUP BY rr."status" ORDER BY count DESC`,
      params,
    );
    const monthly: Array<{ month: string; count: string }> = await this.em.query(
      `SELECT TO_CHAR(rr."reported_at", 'YYYY-MM') AS month, COUNT(*)::text AS count
       FROM "repair_records" rr ${whereClause}
       GROUP BY month ORDER BY month DESC`,
      params,
    );
    const costStats: Array<{ total_cost: string; avg_cost: string; repair_count: string }> = await this.em.query(
      `SELECT
        COALESCE(SUM(rr."actual_cost_cents"), 0)::text AS total_cost,
        COALESCE(AVG(rr."actual_cost_cents"), 0)::text AS avg_cost,
        COUNT(*) FILTER (WHERE rr."actual_cost_cents" IS NOT NULL)::text AS repair_count
       FROM "repair_records" rr ${whereClause}`,
      params,
    );
    return {
      reportType: 'repairs',
      generatedAt: new Date().toISOString(),
      byStatus: byStatus.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      monthly: monthly.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
      costSummary: {
        totalCostCents: parseInt(costStats[0]?.total_cost ?? '0', 10),
        avgCostCents: Math.round(parseFloat(costStats[0]?.avg_cost ?? '0')),
        repairCount: parseInt(costStats[0]?.repair_count ?? '0', 10),
      },
    };
  }

  async disposalsReport(filters: ReportFilters) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`dr."requested_at" >= $${params.length}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`dr."requested_at" <= $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`dr."status" = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const byStatus: Array<{ status: string; count: string }> = await this.em.query(
      `SELECT dr."status", COUNT(*)::text AS count
       FROM "disposal_records" dr ${whereClause}
       GROUP BY dr."status" ORDER BY count DESC`,
      params,
    );
    const byReason: Array<{ reason: string; count: string }> = await this.em.query(
      `SELECT dr."reason", COUNT(*)::text AS count
       FROM "disposal_records" dr ${whereClause}
       GROUP BY dr."reason" ORDER BY count DESC`,
      params,
    );
    const monthly: Array<{ month: string; count: string }> = await this.em.query(
      `SELECT TO_CHAR(dr."requested_at", 'YYYY-MM') AS month, COUNT(*)::text AS count
       FROM "disposal_records" dr ${whereClause}
       GROUP BY month ORDER BY month DESC`,
      params,
    );
    return {
      reportType: 'disposals',
      generatedAt: new Date().toISOString(),
      byStatus: byStatus.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      byReason: byReason.map((r) => ({ reason: r.reason, count: parseInt(r.count, 10) })),
      monthly: monthly.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
    };
  }

  async employeeAssetHistory(employeeUserId: string) {
    const rows: Array<{
      asset_id: string; asset_tag: string; serial_number: string;
      brand: string; model: string; from_status: string; to_status: string;
      reason: string; changed_at: string;
    }> = await this.em.query(
      `SELECT
        ash."asset_id", a."asset_tag", a."serial_number", a."brand", a."model",
        ash."from_status", ash."to_status", ash."reason",
        ash."changed_at"::text AS changed_at
       FROM "asset_status_history" ash
       JOIN "assets" a ON a."id" = ash."asset_id"
       WHERE ash."changed_by_user_id" = $1
          OR a."current_holder_id" = $1
       ORDER BY ash."changed_at" DESC
       LIMIT 500`,
      [employeeUserId],
    );
    return {
      reportType: 'employee-asset-history',
      generatedAt: new Date().toISOString(),
      employeeUserId,
      history: rows,
    };
  }

  async departmentSummary() {
    const rows: Array<{
      department: string; total: string; available: string;
      allocated: string; under_repair: string; disposed: string;
    }> = await this.em.query(
      `SELECT
        COALESCE(a."department", 'Unassigned') AS department,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE a."status" = 'Available')::text AS available,
        COUNT(*) FILTER (WHERE a."status" = 'Allocated')::text AS allocated,
        COUNT(*) FILTER (WHERE a."status" = 'UnderRepair')::text AS under_repair,
        COUNT(*) FILTER (WHERE a."status" = 'Disposed')::text AS disposed
       FROM "assets" a
       GROUP BY department ORDER BY total DESC`,
    );
    return {
      reportType: 'department-summary',
      generatedAt: new Date().toISOString(),
      departments: rows.map((r) => ({
        department: r.department,
        total: parseInt(r.total, 10),
        available: parseInt(r.available, 10),
        allocated: parseInt(r.allocated, 10),
        underRepair: parseInt(r.under_repair, 10),
        disposed: parseInt(r.disposed, 10),
      })),
    };
  }

  async complianceReport() {
    const warrantyExpired: Array<{ count: string }> = await this.em.query(
      `SELECT COUNT(*)::text AS count FROM "assets"
       WHERE "warranty_expiry" IS NOT NULL AND "warranty_expiry" < NOW()
         AND "status" NOT IN ('Disposed', 'Decommissioned')`,
    );
    const warrantyExpiring: Array<{ count: string }> = await this.em.query(
      `SELECT COUNT(*)::text AS count FROM "assets"
       WHERE "warranty_expiry" IS NOT NULL
         AND "warranty_expiry" BETWEEN NOW() AND NOW() + INTERVAL '30 days'
         AND "status" NOT IN ('Disposed', 'Decommissioned')`,
    );
    const noAssessment: Array<{ count: string }> = await this.em.query(
      `SELECT COUNT(*)::text AS count FROM "assets" a
       WHERE a."status" NOT IN ('Registration', 'Disposed', 'Decommissioned')
         AND NOT EXISTS (
           SELECT 1 FROM "assessments" ass WHERE ass."asset_id" = a."id"
         )`,
    );
    return {
      reportType: 'compliance',
      generatedAt: new Date().toISOString(),
      warrantyExpired: parseInt(warrantyExpired[0]?.count ?? '0', 10),
      warrantyExpiring30Days: parseInt(warrantyExpiring[0]?.count ?? '0', 10),
      neverAssessed: parseInt(noAssessment[0]?.count ?? '0', 10),
    };
  }

  async slaPerformance(filters: ReportFilters) {
    const where: string[] = [`wi."definition_key" = 'asset-allocation'`];
    const params: unknown[] = [];
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      where.push(`wi."created_at" >= $${params.length}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      where.push(`wi."created_at" <= $${params.length}`);
    }

    const rows: Array<{
      avg_hours: string; max_hours: string; min_hours: string;
      total: string; completed: string;
    }> = await this.em.query(
      `SELECT
        COALESCE(AVG(EXTRACT(EPOCH FROM (wi."completed_at" - wi."created_at")) / 3600), 0)::text AS avg_hours,
        COALESCE(MAX(EXTRACT(EPOCH FROM (wi."completed_at" - wi."created_at")) / 3600), 0)::text AS max_hours,
        COALESCE(MIN(EXTRACT(EPOCH FROM (wi."completed_at" - wi."created_at")) / 3600), 0)::text AS min_hours,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE wi."completed_at" IS NOT NULL)::text AS completed
       FROM "workflow_instances" wi
       WHERE ${where.join(' AND ')}`,
      params,
    );
    return {
      reportType: 'sla-performance',
      generatedAt: new Date().toISOString(),
      avgCompletionHours: parseFloat(parseFloat(rows[0]?.avg_hours ?? '0').toFixed(1)),
      maxCompletionHours: parseFloat(parseFloat(rows[0]?.max_hours ?? '0').toFixed(1)),
      minCompletionHours: parseFloat(parseFloat(rows[0]?.min_hours ?? '0').toFixed(1)),
      totalWorkflows: parseInt(rows[0]?.total ?? '0', 10),
      completedWorkflows: parseInt(rows[0]?.completed ?? '0', 10),
    };
  }

  async dashboardAnalytics() {
    const [assets, repairs, disposals, returns] = await Promise.all([
      this.em.query(
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE "status" = 'Available')::text AS available,
          COUNT(*) FILTER (WHERE "status" = 'Allocated')::text AS allocated,
          COUNT(*) FILTER (WHERE "status" = 'UnderRepair')::text AS under_repair,
          COUNT(*) FILTER (WHERE "status" = 'Disposed')::text AS disposed
         FROM "assets"`,
      ),
      this.em.query(
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE "status" NOT IN ('Completed', 'Failed', 'BeyondRepair'))::text AS active
         FROM "repair_records"`,
      ),
      this.em.query(
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE "status" = 'Requested')::text AS pending
         FROM "disposal_records"`,
      ),
      this.em.query(
        `SELECT COUNT(*)::text AS total FROM "return_records"`,
      ),
    ]);

    const monthlyAllocations: Array<{ month: string; count: string }> = await this.em.query(
      `SELECT TO_CHAR(wi."created_at", 'YYYY-MM') AS month, COUNT(*)::text AS count
       FROM "workflow_instances" wi
       WHERE wi."definition_key" = 'asset-allocation'
         AND wi."created_at" >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month`,
    );
    const monthlyReturns: Array<{ month: string; count: string }> = await this.em.query(
      `SELECT TO_CHAR(r."created_at", 'YYYY-MM') AS month, COUNT(*)::text AS count
       FROM "return_records" r
       WHERE r."created_at" >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month`,
    );

    const assetDistribution: Array<{ asset_type: string; count: string }> = await this.em.query(
      `SELECT "asset_type", COUNT(*)::text AS count FROM "assets"
       WHERE "status" != 'Disposed'
       GROUP BY "asset_type" ORDER BY count DESC`,
    );

    return {
      reportType: 'dashboard',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssets: parseInt(assets[0]?.total ?? '0', 10),
        availableAssets: parseInt(assets[0]?.available ?? '0', 10),
        allocatedAssets: parseInt(assets[0]?.allocated ?? '0', 10),
        underRepair: parseInt(assets[0]?.under_repair ?? '0', 10),
        disposedAssets: parseInt(assets[0]?.disposed ?? '0', 10),
        activeRepairs: parseInt(repairs[0]?.active ?? '0', 10),
        pendingDisposals: parseInt(disposals[0]?.pending ?? '0', 10),
        totalReturns: parseInt(returns[0]?.total ?? '0', 10),
      },
      charts: {
        monthlyAllocations: monthlyAllocations.map((r) => ({
          month: r.month,
          count: parseInt(r.count, 10),
        })),
        monthlyReturns: monthlyReturns.map((r) => ({
          month: r.month,
          count: parseInt(r.count, 10),
        })),
        assetDistribution: assetDistribution.map((r) => ({
          assetType: r.asset_type,
          count: parseInt(r.count, 10),
        })),
      },
    };
  }

  private applyAssetFilters(
    where: string[],
    params: unknown[],
    filters: ReportFilters,
  ): void {
    if (filters.assetType) {
      params.push(filters.assetType);
      where.push(`a."asset_type" = $${params.length}`);
    }
    if (filters.brand) {
      params.push(filters.brand);
      where.push(`a."brand" = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`a."status" = $${params.length}`);
    }
    if (filters.department) {
      params.push(filters.department);
      where.push(`a."department" = $${params.length}`);
    }
  }
}
