import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { BreachDto } from '@/api/compliance.api';
import { useComplianceDashboard, useBreaches, useRunScan } from '../hooks/useCompliance';
import { ApiError } from '@/types/api';

const DEFINITION_LABELS: Record<string, string> = {
  'asset-return': 'Asset Return',
  'asset-allocation': 'Asset Allocation',
};

const STATE_LABELS: Record<string, string> = {
  Initiated: 'Initiated',
  Assessment: 'Assessment',
  AwaitingEmployeeSignature: 'Employee Signature',
  AwaitingItSignature: 'IT Signature',
  AwaitingPcSignature: 'P&C Signature',
  Requested: 'Requested',
  PcReview: 'P&C Review',
  StoresSelect: 'Stores Selection',
  ItAssessment: 'IT Assessment',
  EmployeeSignature: 'Employee Signature',
  PcSignature: 'P&C Signature',
  ItSignature: 'IT Signature',
  InventoryUpdate: 'Inventory Update',
};

export const CompliancePage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [definitionKey, setDefinitionKey] = useState<string | undefined>();
  const [resolved, setResolved] = useState<boolean | undefined>();

  const dashboardQuery = useComplianceDashboard();
  const breachesQuery = useBreaches({ page, pageSize, definitionKey, resolved });
  const runScan = useRunScan();

  const dash = dashboardQuery.data;

  const handleScan = async () => {
    try {
      const result = await runScan.mutateAsync();
      messageApi.success(`Scan complete: ${result.detected} new breaches detected, ${result.resolved} resolved`);
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Scan failed');
    }
  };

  const columns: ColumnsType<BreachDto> = [
    {
      title: 'Workflow',
      dataIndex: 'definitionKey',
      key: 'definitionKey',
      render: (v: string) => DEFINITION_LABELS[v] ?? v,
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (_, r) => `${r.subjectType} ${r.subjectId.slice(0, 8)}…`,
    },
    {
      title: 'Stage',
      dataIndex: 'breachedState',
      key: 'breachedState',
      render: (v: string) => STATE_LABELS[v] ?? v,
    },
    {
      title: 'SLA',
      key: 'sla',
      render: (_, r) => {
        const hours = Math.round(r.slaMinutes / 60);
        return `${hours}h`;
      },
    },
    {
      title: 'Breached At',
      dataIndex: 'breachedAt',
      key: 'breachedAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) =>
        r.resolvedAt ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Resolved</Tag>
        ) : (
          <Tag color="red" icon={<ClockCircleOutlined />}>Open</Tag>
        ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Compliance"
        subtitle="SLA breach monitoring and tracking"
        actions={
          <Button
            icon={<SyncOutlined spin={runScan.isPending} />}
            onClick={handleScan}
            loading={runScan.isPending}
          >
            Run Scan
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Breaches"
              value={dash?.totalBreaches ?? 0}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Open Breaches"
              value={dash?.openBreaches ?? 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: (dash?.openBreaches ?? 0) > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Resolved"
              value={dash?.resolvedBreaches ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Escalations Sent"
              value={dash?.escalationsSent ?? 0}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {dash && dash.breachesByState.length > 0 && (
        <Card title="Open Breaches by Stage" style={{ marginBottom: 16 }}>
          <Space wrap>
            {dash.breachesByState.map((s) => (
              <Tag key={s.state} color="red">
                {STATE_LABELS[s.state] ?? s.state}: {s.count}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      <Card title="Breach History">
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filter by workflow"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => { setDefinitionKey(v); setPage(1); }}
            options={[
              { label: 'Asset Return', value: 'asset-return' },
              { label: 'Asset Allocation', value: 'asset-allocation' },
            ]}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            onChange={(v) => { setResolved(v); setPage(1); }}
            options={[
              { label: 'Open', value: false },
              { label: 'Resolved', value: true },
            ]}
          />
        </Space>
        <Table<BreachDto>
          rowKey="id"
          columns={columns}
          dataSource={breachesQuery.data?.data ?? []}
          loading={breachesQuery.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: breachesQuery.data?.total ?? 0,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>
    </div>
  );
};
