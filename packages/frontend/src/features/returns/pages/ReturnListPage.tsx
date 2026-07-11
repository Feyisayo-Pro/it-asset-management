import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { ReturnDto } from '@/api/returns.api';
import { useReturns } from '../hooks/useReturns';

const STATE_COLOR: Record<string, string> = {
  Initiated: 'gold',
  Assessment: 'orange',
  AwaitingEmployeeSignature: 'blue',
  AwaitingItSignature: 'blue',
  AwaitingPcSignature: 'blue',
  Completed: 'green',
  Cancelled: 'default',
};

const STATES = Object.keys(STATE_COLOR);

export const ReturnListPage = () => {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [state, setState] = useState<string | undefined>();

  const query = useReturns({ page, pageSize, state });

  const columns: ColumnsType<ReturnDto> = [
    {
      title: 'Return',
      key: 'id',
      render: (_, r) => (
        <a onClick={() => nav(`/returns/${r.id}`)}>{r.id.slice(0, 8)}…</a>
      ),
    },
    { title: 'Asset', dataIndex: 'assetId', key: 'assetId', render: (v: string) => `${v.slice(0, 8)}…` },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
    {
      title: 'State',
      key: 'state',
      render: (_, r) => (
        <Tag color={STATE_COLOR[r.currentState] ?? 'default'}>{r.currentState}</Tag>
      ),
    },
    { title: 'Outcome', dataIndex: 'outcome', key: 'outcome', render: (v) => v ?? '—' },
    {
      title: 'Initiated',
      key: 'createdAt',
      render: (_, r) => new Date(r.createdAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Returns"
        subtitle="Asset return workflows"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/returns/new')}>
            Initiate return
          </Button>
        }
      />
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="All states"
            allowClear
            style={{ width: 260 }}
            options={STATES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => {
              setState(v);
              setPage(1);
            }}
          />
        </Space>
        <Table<ReturnDto>
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
