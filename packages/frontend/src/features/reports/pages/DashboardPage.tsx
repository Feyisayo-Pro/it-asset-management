import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  DeleteOutlined,
  SwapOutlined,
  WarningOutlined,
  InboxOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { useDashboard } from '../hooks/useReports';
import { SimpleBarChart, SimplePieChart } from '../components/SimpleBarChart';

export const DashboardPage = () => {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Analytics overview" />
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  const s = data.summary;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Analytics overview" />

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Assets"
              value={s.totalAssets}
              prefix={<LaptopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Available"
              value={s.availableAssets}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Allocated"
              value={s.allocatedAssets}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1B73E8' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Under Repair"
              value={s.underRepair}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Disposed"
              value={s.disposedAssets}
              prefix={<DeleteOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Active Repairs"
              value={s.activeRepairs}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pending Disposals"
              value={s.pendingDisposals}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Returns"
              value={s.totalReturns}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card>
            <SimpleBarChart
              title="Monthly Allocations (last 12 months)"
              data={data.charts.monthlyAllocations.map((d) => ({
                label: d.month.slice(5),
                value: d.count,
              }))}
              color="#1B73E8"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <SimpleBarChart
              title="Monthly Returns (last 12 months)"
              data={data.charts.monthlyReturns.map((d) => ({
                label: d.month.slice(5),
                value: d.count,
              }))}
              color="#34A853"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card>
            <SimplePieChart
              title="Asset Distribution by Type"
              data={data.charts.assetDistribution.map((d) => ({
                label: d.assetType,
                value: d.count,
                color: '',
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
