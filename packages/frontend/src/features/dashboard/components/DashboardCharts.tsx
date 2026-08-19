import { Card, Col, Empty, Row } from 'antd';
import { DashboardCharts as DashboardChartsData } from '@/api/dashboard.api';
import {
  SimpleBarChart,
  SimplePieChart,
} from '@/features/reports/components/SimpleBarChart';
import { RoleName } from '@/types/role';

interface Props {
  charts: DashboardChartsData;
  role: string;
}

const CHART_COLORS = {
  department: '#1A4FD1',
  brand: '#9334E6',
  type: '#34A853',
  allocation: '#1A4FD1',
  returns: '#34A853',
  repairs: '#fa8c16',
};

const PIE_COLORS = [
  '#EA4335',
  '#FBBC04',
  '#34A853',
  '#9E9E9E',
];

interface ChartSection {
  key: string;
  title: string;
  roles?: string[];
}

const CHART_SECTIONS: ChartSection[] = [
  {
    key: 'assetsByDepartment',
    title: 'Assets by Department',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.PEOPLE_CULTURE],
  },
  {
    key: 'assetsByBrand',
    title: 'Assets by Brand',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
  },
  {
    key: 'assetsByType',
    title: 'Assets by Type',
  },
  {
    key: 'allocationTrends',
    title: 'Allocation Trends',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.PEOPLE_CULTURE],
  },
  {
    key: 'returnTrends',
    title: 'Return Trends',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.PEOPLE_CULTURE],
  },
  {
    key: 'repairTrends',
    title: 'Repair Trends',
    roles: [RoleName.SUPER_ADMIN, RoleName.IT_REP, RoleName.STORES_OFFICER],
  },
  {
    key: 'compliancePerformance',
    title: 'Compliance Performance',
    roles: [RoleName.SUPER_ADMIN, RoleName.IT_REP, RoleName.STORES_OFFICER],
  },
];

export const DashboardCharts = ({ charts, role }: Props) => {
  const visible = CHART_SECTIONS.filter(
    (s) => !s.roles || s.roles.includes(role),
  );

  if (visible.length === 0) return null;

  return (
    <Row gutter={[16, 16]}>
      {visible.map((section) => (
        <Col key={section.key} xs={24} lg={12}>
          <Card size="small" title={section.title}>
            {renderChart(section.key, charts)}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

function renderChart(key: string, charts: DashboardChartsData) {
  switch (key) {
    case 'assetsByDepartment':
      return renderBarChart(charts.assetsByDepartment, CHART_COLORS.department);
    case 'assetsByBrand':
      return renderBarChart(charts.assetsByBrand, CHART_COLORS.brand);
    case 'assetsByType':
      return renderPieChart(charts.assetsByType);
    case 'allocationTrends':
      return renderTrendChart(charts.allocationTrends, CHART_COLORS.allocation);
    case 'returnTrends':
      return renderTrendChart(charts.returnTrends, CHART_COLORS.returns);
    case 'repairTrends':
      return renderTrendChart(charts.repairTrends, CHART_COLORS.repairs);
    case 'compliancePerformance':
      return renderComplianceChart(charts.compliancePerformance);
    default:
      return null;
  }
}

function renderBarChart(
  data: Array<{ label: string; value: number }>,
  color: string,
) {
  if (!data.length) return <Empty description="No data" />;
  return <SimpleBarChart data={data} color={color} height={180} />;
}

function renderTrendChart(
  data: Array<{ month: string; count: number }>,
  color: string,
) {
  if (!data.length) return <Empty description="No data" />;
  return (
    <SimpleBarChart
      data={data.map((d) => ({ label: d.month.slice(5), value: d.count }))}
      color={color}
      height={180}
    />
  );
}

function renderPieChart(data: Array<{ label: string; value: number }>) {
  if (!data.length) return <Empty description="No data" />;
  return (
    <SimplePieChart
      data={data.map((d) => ({ label: d.label, value: d.value, color: '' }))}
      size={150}
    />
  );
}

function renderComplianceChart(data: Array<{ label: string; value: number }>) {
  if (!data.length) return <Empty description="No data" />;
  return (
    <SimplePieChart
      data={data.map((d, i) => ({
        label: `${d.label} (${d.value})`,
        value: d.value,
        color: PIE_COLORS[i] || '',
      }))}
      size={150}
    />
  );
}
