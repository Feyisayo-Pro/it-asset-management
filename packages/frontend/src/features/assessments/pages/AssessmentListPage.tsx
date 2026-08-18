import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { AssessmentDto } from '@/api/assessments.api';
import { useAssessments } from '../hooks/useAssessments';

const OUTCOME_COLOR: Record<string, string> = {
  Pass: 'green',
  RepairRecommended: 'orange',
  ReplacementRecommended: 'volcano',
  Reject: 'red',
};

export const AssessmentListPage = () => {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<'Draft' | 'Completed' | undefined>();

  const query = useAssessments({ page, pageSize, status });

  const columns: ColumnsType<AssessmentDto> = [
    {
      title: 'Assessment',
      key: 'id',
      render: (_, r) => (
        <a onClick={() => nav(`/assessments/${r.id}`)}>{r.id.slice(0, 8)}…</a>
      ),
    },
    { title: 'Asset', dataIndex: 'assetId', render: (v: string) => `${v.slice(0, 8)}…` },
    {
      title: 'Context',
      key: 'context',
      render: (_, r) =>
        r.contextType === 'Standalone'
          ? 'Standalone'
          : `${r.contextType} ${r.contextId ? `(${r.contextId.slice(0, 8)}…)` : ''}`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => (
        <Tag color={r.status === 'Completed' ? 'green' : 'gold'}>{r.status}</Tag>
      ),
    },
    {
      title: 'Outcome',
      key: 'outcome',
      render: (_, r) =>
        r.outcome ? <Tag color={OUTCOME_COLOR[r.outcome]}>{r.outcome}</Tag> : '—',
    },
    {
      title: 'Started',
      key: 'startedAt',
      render: (_, r) => new Date(r.startedAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="Device inspection records"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav('/assessments/new')}
          >
            New assessment
          </Button>
        }
      />
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="All statuses"
            allowClear
            style={{ width: 180 }}
            options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Completed', label: 'Completed' },
            ]}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </Space>
        <Table<AssessmentDto>
          rowKey="id"
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={query.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: query.data?.total ?? 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
};
