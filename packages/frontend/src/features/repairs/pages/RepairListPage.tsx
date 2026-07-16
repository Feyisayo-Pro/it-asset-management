import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import {
  REPAIR_STATUSES,
  RepairDto,
  RepairStatus,
} from '@/api/repairs.api';
import { useRepairs } from '../hooks/useRepairs';

const STATUS_COLOR: Record<RepairStatus, string> = {
  Pending: 'gold',
  Diagnosing: 'blue',
  AwaitingParts: 'orange',
  InProgress: 'geekblue',
  Completed: 'green',
  Failed: 'volcano',
  BeyondRepair: 'red',
};

const money = (v: number | null, ccy: string) =>
  v == null ? '—' : `${ccy} ${v.toFixed(2)}`;

export const RepairListPage = () => {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<RepairStatus | undefined>();

  const query = useRepairs({ page, pageSize, status });

  const columns: ColumnsType<RepairDto> = [
    {
      title: 'Repair',
      key: 'id',
      render: (_, r) => (
        <a onClick={() => nav(`/repairs/${r.id}`)}>{r.id.slice(0, 8)}…</a>
      ),
    },
    {
      title: 'Asset',
      dataIndex: 'assetId',
      key: 'assetId',
      render: (v: string) => `${v.slice(0, 8)}…`,
    },
    { title: 'Reported fault', dataIndex: 'reportedFault', key: 'reportedFault', ellipsis: true },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>,
    },
    {
      title: 'Cost',
      key: 'cost',
      render: (_, r) =>
        `${money(r.actualCost, r.costCurrency)} / est ${money(r.estimatedCost, r.costCurrency)}`,
    },
    {
      title: 'Reported',
      key: 'reportedAt',
      render: (_, r) => new Date(r.reportedAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Repairs"
        subtitle="Device repair and maintenance jobs"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/repairs/new')}>
            Open repair
          </Button>
        }
      />
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select<RepairStatus>
            placeholder="All statuses"
            allowClear
            style={{ width: 240 }}
            value={status}
            options={REPAIR_STATUSES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </Space>
        <Table<RepairDto>
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
