import { EnterpriseDashboardService } from '../../../src/modules/dashboard/application/enterprise-dashboard.service';

const mockQuery = jest.fn();
const mockEm = { query: mockQuery } as any;

describe('EnterpriseDashboardService', () => {
  let service: EnterpriseDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EnterpriseDashboardService(mockEm);
  });

  describe('getKpis', () => {
    it('returns all 10 KPI metrics for Super Admin', async () => {
      mockQuery
        .mockResolvedValueOnce([{
          totalAssets: 100, available: 40, allocated: 30, underRepair: 10,
          returned: 5, disposed: 8, lost: 3, stolen: 4,
        }])
        .mockResolvedValueOnce([{ count: 12 }])
        .mockResolvedValueOnce([{ count: 7 }]);

      const kpis = await service.getKpis({}, { userId: 'u1', roleName: 'SUPER_ADMIN' });

      expect(kpis.totalAssets).toBe(100);
      expect(kpis.available).toBe(40);
      expect(kpis.allocated).toBe(30);
      expect(kpis.underRepair).toBe(10);
      expect(kpis.returned).toBe(5);
      expect(kpis.disposed).toBe(8);
      expect(kpis.lost).toBe(3);
      expect(kpis.stolen).toBe(4);
      expect(kpis.pendingRequests).toBe(12);
      expect(kpis.pendingApprovals).toBe(7);
    });

    it('scopes asset counts to current_holder_id for Employee', async () => {
      mockQuery
        .mockResolvedValueOnce([{
          totalAssets: 2, available: 0, allocated: 2, underRepair: 0,
          returned: 0, disposed: 0, lost: 0, stolen: 0,
        }])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      const kpis = await service.getKpis({}, { userId: 'emp-1', roleName: 'EMPLOYEE' });

      expect(kpis.totalAssets).toBe(2);
      expect(kpis.allocated).toBe(2);
      expect(kpis.pendingRequests).toBe(1);
      expect(kpis.pendingApprovals).toBe(0);

      const assetQuery = mockQuery.mock.calls[0][0] as string;
      expect(assetQuery).toContain('current_holder_id');

      const pendingQuery = mockQuery.mock.calls[1][0] as string;
      expect(pendingQuery).toContain('started_by_user_id');
    });

    it('applies department filter to asset query', async () => {
      mockQuery
        .mockResolvedValueOnce([{
          totalAssets: 15, available: 10, allocated: 5, underRepair: 0,
          returned: 0, disposed: 0, lost: 0, stolen: 0,
        }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      await service.getKpis(
        { department: 'Engineering' },
        { userId: 'u1', roleName: 'SUPER_ADMIN' },
      );

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('"department"');
      expect(mockQuery.mock.calls[0][1]).toEqual(['Engineering']);
    });

    it('applies office filter to asset query', async () => {
      mockQuery
        .mockResolvedValueOnce([{
          totalAssets: 8, available: 5, allocated: 3, underRepair: 0,
          returned: 0, disposed: 0, lost: 0, stolen: 0,
        }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      await service.getKpis(
        { office: 'Lagos HQ' },
        { userId: 'u1', roleName: 'STORES_OFFICER' },
      );

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('"office_location"');
    });
  });

  describe('getCharts', () => {
    it('returns empty charts for Employee role', async () => {
      const charts = await service.getCharts({}, { userId: 'emp-1', roleName: 'EMPLOYEE' });

      expect(charts.assetsByDepartment).toEqual([]);
      expect(charts.assetsByBrand).toEqual([]);
      expect(charts.assetsByType).toEqual([]);
      expect(charts.allocationTrends).toEqual([]);
      expect(charts.returnTrends).toEqual([]);
      expect(charts.repairTrends).toEqual([]);
      expect(charts.compliancePerformance).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns 7 chart datasets for Super Admin', async () => {
      mockQuery
        .mockResolvedValueOnce([{ label: 'Engineering', value: 20 }])
        .mockResolvedValueOnce([{ label: 'Dell', value: 15 }])
        .mockResolvedValueOnce([{ label: 'Laptop', value: 30 }])
        .mockResolvedValueOnce([{ month: '2025-01', count: 5 }])
        .mockResolvedValueOnce([{ month: '2025-01', count: 3 }])
        .mockResolvedValueOnce([{ month: '2025-01', count: 2 }])
        .mockResolvedValueOnce([{
          expired: 3, expiringSoon: 5, valid: 50, noWarranty: 10,
        }]);

      const charts = await service.getCharts({}, { userId: 'u1', roleName: 'SUPER_ADMIN' });

      expect(charts.assetsByDepartment).toHaveLength(1);
      expect(charts.assetsByBrand).toHaveLength(1);
      expect(charts.assetsByType).toHaveLength(1);
      expect(charts.allocationTrends).toHaveLength(1);
      expect(charts.returnTrends).toHaveLength(1);
      expect(charts.repairTrends).toHaveLength(1);
      expect(charts.compliancePerformance).toHaveLength(4);
    });
  });

  describe('getWidgets', () => {
    it('returns scoped widgets for Employee', async () => {
      mockQuery
        .mockResolvedValueOnce([{
          id: 'n1', event_type: 'ALLOCATION_APPROVED', subject: 'Approved',
          message: 'Done', read: false, created_at: '2025-01-01',
        }])
        .mockResolvedValueOnce([{
          id: 'w1', workflow_name: 'Allocation', subject_type: 'allocation',
          subject_id: 'a1', current_state: 'pending', created_at: '2025-01-01',
        }]);

      const widgets = await service.getWidgets({
        userId: 'emp-1',
        roleName: 'EMPLOYEE',
      });

      expect(widgets.recentActivity).toEqual([]);
      expect(widgets.notifications).toHaveLength(1);
      expect(widgets.pendingTasks).toHaveLength(1);
      expect(widgets.upcomingWarrantyExpirations).toEqual([]);
      expect(widgets.recentRepairs).toEqual([]);
      expect(widgets.recentlyAddedAssets).toEqual([]);
    });

    it('returns all 6 widget sections for Super Admin', async () => {
      mockQuery
        .mockResolvedValueOnce([{
          id: 'a1', action: 'asset.created', entity_type: 'asset',
          entity_id: 'x1', first_name: 'John', last_name: 'Doe',
          occurred_at: '2025-01-01',
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const widgets = await service.getWidgets({
        userId: 'u1',
        roleName: 'SUPER_ADMIN',
      });

      expect(widgets.recentActivity).toHaveLength(1);
      expect(widgets.recentActivity[0].userName).toBe('John Doe');
    });
  });

  describe('getFilterOptions', () => {
    it('returns distinct departments, offices, and asset types', async () => {
      mockQuery
        .mockResolvedValueOnce([{ val: 'Engineering' }, { val: 'Marketing' }])
        .mockResolvedValueOnce([{ val: 'Lagos HQ' }, { val: 'Abuja Office' }])
        .mockResolvedValueOnce([{ val: 'Laptop' }, { val: 'Monitor' }]);

      const opts = await service.getFilterOptions();

      expect(opts.departments).toEqual(['Engineering', 'Marketing']);
      expect(opts.offices).toEqual(['Lagos HQ', 'Abuja Office']);
      expect(opts.assetTypes).toEqual(['Laptop', 'Monitor']);
    });
  });

  describe('getDashboard', () => {
    it('returns complete dashboard response with role and timestamp', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await service.getDashboard(
        {},
        { userId: 'emp-1', roleName: 'EMPLOYEE' },
      );

      expect(result.role).toBe('EMPLOYEE');
      expect(result.generatedAt).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.charts).toBeDefined();
      expect(result.widgets).toBeDefined();
      expect(result.filterOptions).toBeDefined();
    });
  });
});
