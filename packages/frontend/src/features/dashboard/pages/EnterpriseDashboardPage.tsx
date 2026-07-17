import { useState } from 'react';
import { Card, Skeleton, Typography } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { QueryErrorAlert } from '@/components/QueryErrorAlert';
import { DashboardFilters } from '@/api/dashboard.api';
import { useAuthStore } from '@/stores/auth.store';
import { RoleName } from '@/types/role';
import {
  useEnterpriseDashboard,
  useDashboardFilterOptions,
} from '../hooks/useEnterpriseDashboard';
import { KpiCards } from '../components/KpiCards';
import { DashboardCharts } from '../components/DashboardCharts';
import { DashboardWidgetsPanel } from '../components/DashboardWidgets';
import { DashboardFilterBar } from '../components/DashboardFilterBar';

const ROLE_SUBTITLES: Record<string, string> = {
  [RoleName.SUPER_ADMIN]: 'Organization-wide overview',
  [RoleName.STORES_OFFICER]: 'Inventory & allocations overview',
  [RoleName.IT_REP]: 'Technical assets & repairs overview',
  [RoleName.PEOPLE_CULTURE]: 'Employee assets & allocations overview',
  [RoleName.EMPLOYEE]: 'My assets overview',
};

export const EnterpriseDashboardPage = () => {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const user = useAuthStore((s) => s.user);
  const roleName = (user?.roleName ?? 'EMPLOYEE') as RoleName;
  const isEmployee = roleName === RoleName.EMPLOYEE;

  const { data, isLoading, isError, refetch } = useEnterpriseDashboard(filters);
  const filterOptionsQuery = useDashboardFilterOptions();

  const subtitle =
    ROLE_SUBTITLES[roleName] ?? 'Dashboard';

  if (isError) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${user?.email?.split('@')[0] ?? 'User'}`}
          subtitle={subtitle}
        />
        <QueryErrorAlert message="Failed to load dashboard data." onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${user?.email?.split('@')[0] ?? 'User'}`}
          subtitle={subtitle}
        />
        <Skeleton active paragraph={{ rows: 16 }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.email?.split('@')[0] ?? 'User'}`}
        subtitle={subtitle}
      />

      <KpiCards kpis={data.kpis} role={roleName} />

      {!isEmployee && (
        <Card
          size="small"
          style={{ marginTop: 16, marginBottom: 16 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <DashboardFilterBar
            filters={filters}
            filterOptions={filterOptionsQuery.data ?? data.filterOptions}
            onChange={setFilters}
          />
        </Card>
      )}

      {!isEmployee && (
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5} style={{ marginBottom: 12 }}>
            Analytics
          </Typography.Title>
          <DashboardCharts charts={data.charts} role={roleName} />
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          {isEmployee ? 'My Dashboard' : 'Widgets'}
        </Typography.Title>
        <DashboardWidgetsPanel widgets={data.widgets} role={roleName} />
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          Last updated: {new Date(data.generatedAt).toLocaleTimeString()} &middot;
          Auto-refreshes every 60s
        </Typography.Text>
      </div>
    </div>
  );
};
