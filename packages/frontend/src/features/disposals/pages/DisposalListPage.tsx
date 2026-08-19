import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import {
  DISPOSAL_STATUSES,
  DisposalDto,
  DisposalStatus,
} from '@/api/disposals.api';
import { useDisposals } from '../hooks/useDisposals';

const STATUS_COLOR: Record<DisposalStatus, string> = {
  Requested: 'gold',
  Approved: 'green',
  Rejected: 'volcano',
};

export const DisposalListPage = () => {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<DisposalStatus | undefined>();

  const query = useDisposals({ page, pageSize, status });

  const columns: ColumnsType<DisposalDto> = [
    {
      title: 'Disposal',
      key: 'id',
      render: (_, d) => (
        <a onClick={() => nav(`/disposals/${d.id}`)}>{d.id.slice(0, 8)}…</a>
      ),
    },
    {
      title: 'Asset',
      dataIndex: 'assetId',
      key: 'assetId',
      render: (v: string) => `${v.slice(0, 8)}…`,
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
    { title: 'Method', dataIndex: 'method', key: 'method' },
    {
      title: 'Status',
      key: 'status',
      render: (_, d) => <Tag color={STATUS_COLOR[d.status]}>{d.status}</Tag>,
    },
    {
      title: 'Requested',
      key: 'requestedAt',
      render: (_, d) => new Date(d.requestedAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Disposals"
        subtitle="Asset disposal requests and approvals"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/disposals/new')}>
            Request disposal
          </Button>
        }
      />
      <Card>
        <Space className="list-filters" style={{ marginBottom: 16 }} wrap>
          <Select<DisposalStatus>
            placeholder="All statuses"
            allowClear
            style={{ width: 220 }}
            value={status}
            options={DISPOSAL_STATUSES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </Space>
        <Table<DisposalDto>
          rowKey="id"
          scroll={{ x: 'max-content' }}
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
