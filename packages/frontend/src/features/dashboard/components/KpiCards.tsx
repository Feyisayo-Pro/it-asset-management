import { Card, Col, Row, Statistic } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ToolOutlined,
  SwapOutlined,
  DeleteOutlined,
  WarningOutlined,
  StopOutlined,
  ClockCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { DashboardKpis } from '@/api/dashboard.api';
import { RoleName } from '@/types/role';

interface Props {
  kpis: DashboardKpis;
  role: string;
}

interface KpiConfig {
  key: keyof DashboardKpis;
  title: string;
  icon: React.ReactNode;
  color?: string;
  roles?: string[];
}

const KPI_CONFIG: KpiConfig[] = [
  {
    key: 'totalAssets',
    title: 'Total Assets',
    icon: <LaptopOutlined />,
  },
  {
    key: 'available',
    title: 'Available',
    icon: <CheckCircleOutlined />,
    color: '#3f8600',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP, RoleName.PEOPLE_CULTURE],
  },
  {
    key: 'allocated',
    title: 'Allocated',
    icon: <TeamOutlined />,
    color: '#1B73E8',
  },
  {
    key: 'underRepair',
    title: 'Under Repair',
    icon: <ToolOutlined />,
    color: '#faad14',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
  },
  {
    key: 'returned',
    title: 'Returned',
    icon: <SwapOutlined />,
    color: '#13c2c2',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.PEOPLE_CULTURE],
  },
  {
    key: 'disposed',
    title: 'Disposed',
    icon: <DeleteOutlined />,
    color: '#cf1322',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER],
  },
  {
    key: 'lost',
    title: 'Lost',
    icon: <WarningOutlined />,
    color: '#fa541c',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
  },
  {
    key: 'stolen',
    title: 'Stolen',
    icon: <StopOutlined />,
    color: '#a8071a',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
  },
  {
    key: 'pendingRequests',
    title: 'Pending Requests',
    icon: <ClockCircleOutlined />,
    color: '#722ed1',
  },
  {
    key: 'pendingApprovals',
    title: 'Pending Approvals',
    icon: <AuditOutlined />,
    color: '#eb2f96',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP, RoleName.PEOPLE_CULTURE],
  },
];

export const KpiCards = ({ kpis, role }: Props) => {
  const visibleKpis = KPI_CONFIG.filter(
    (k) => !k.roles || k.roles.includes(role),
  );

  return (
    <Row gutter={[12, 12]}>
      {visibleKpis.map((k) => (
        <Col key={k.key} xs={12} sm={8} md={6} lg={4} xxl={4}>
          <Card size="small" hoverable styles={{ body: { padding: '16px 12px' } }}>
            <Statistic
              title={k.title}
              value={kpis[k.key]}
              prefix={k.icon}
              valueStyle={k.color ? { color: k.color, fontSize: 22 } : { fontSize: 22 }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};
