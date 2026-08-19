import { Card, Col, Row, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
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
  /** AssetStatus this card represents — clicking navigates to /assets
   *  filtered to it. Omitted for KPIs with no 1:1 asset status
   *  (pending requests/approvals are workflow-based, not asset status). */
  assetStatus?: string;
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
    assetStatus: 'Available',
  },
  {
    key: 'allocated',
    title: 'Allocated',
    icon: <TeamOutlined />,
    color: '#1A4FD1',
    assetStatus: 'Allocated',
  },
  {
    key: 'underRepair',
    title: 'Under Repair',
    icon: <ToolOutlined />,
    color: '#faad14',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
    assetStatus: 'UnderRepair',
  },
  {
    key: 'returned',
    title: 'Returned',
    icon: <SwapOutlined />,
    color: '#13c2c2',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.PEOPLE_CULTURE],
    assetStatus: 'Returned',
  },
  {
    key: 'disposed',
    title: 'Disposed',
    icon: <DeleteOutlined />,
    color: '#cf1322',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER],
    assetStatus: 'Disposed',
  },
  {
    key: 'lost',
    title: 'Lost',
    icon: <WarningOutlined />,
    color: '#fa541c',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
    assetStatus: 'Lost',
  },
  {
    key: 'stolen',
    title: 'Stolen',
    icon: <StopOutlined />,
    color: '#a8071a',
    roles: [RoleName.SUPER_ADMIN, RoleName.STORES_OFFICER, RoleName.IT_REP],
    assetStatus: 'Stolen',
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
  const nav = useNavigate();
  // /assets is off-limits for EMPLOYEE (see router.tsx) — don't offer a
  // navigation that would just bounce them to a permission-denied page.
  const canBrowseAssets = role !== RoleName.EMPLOYEE;
  const visibleKpis = KPI_CONFIG.filter(
    (k) => !k.roles || k.roles.includes(role),
  );

  return (
    <Row gutter={[12, 12]}>
      {visibleKpis.map((k) => {
        const clickable = canBrowseAssets && (k.assetStatus !== undefined || k.key === 'totalAssets');
        return (
          <Col key={k.key} xs={12} sm={8} md={6} lg={4} xxl={4}>
            <Card
              size="small"
              hoverable
              styles={{ body: { padding: '16px 12px' } }}
              onClick={
                clickable
                  ? () =>
                      nav(k.assetStatus ? `/assets?status=${k.assetStatus}` : '/assets')
                  : undefined
              }
              style={clickable ? { cursor: 'pointer' } : undefined}
            >
              <Statistic
                title={k.title}
                value={kpis[k.key]}
                prefix={k.icon}
                valueStyle={k.color ? { color: k.color, fontSize: 22 } : { fontSize: 22 }}
              />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};
