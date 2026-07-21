import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { AllocationDto } from '@/api/allocations.api';
import { useAllocations } from '../hooks/useAllocations';
import dayjs from 'dayjs';

const STATE_COLORS: Record<string, string> = {
  Requested: 'blue',
  PcReview: 'orange',
  StoresSelect: 'gold',
  ItAssessment: 'purple',
  EmployeeSignature: 'cyan',
  PcSignature: 'geekblue',
  ItSignature: 'magenta',
  InventoryUpdate: 'lime',
  Completed: 'green',
  Rejected: 'red',
  Cancelled: 'default',
};

const STATE_LABELS: Record<string, string> = {
  Requested: 'Requested',
  PcReview: 'P&C Review',
  StoresSelect: 'Stores Selection',
  ItAssessment: 'IT Assessment',
  EmployeeSignature: 'Employee Signature',
  PcSignature: 'P&C Signature',
  ItSignature: 'IT Signature',
  InventoryUpdate: 'Inventory Update',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
};

export const AllocationListPage = () => {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const query = useAllocations({
    page,
    pageSize,
    search: search || undefined,
    status,
  });

  const columns: ColumnsType<AllocationDto> = [
    {
      title: 'Employee',
      key: 'employeeName',
      render: (_, r) => (
        <a onClick={() => nav(`/allocations/${r.id}`)}>{r.employeeName || '—'}</a>
      ),
    },
    {
      title: 'Asset',
      key: 'assetTag',
      render: (_, r) => r.assetTag || '—',
    },
    {
      title: 'Stage',
      key: 'currentState',
      render: (_, r) => (
        <Tag color={STATE_COLORS[r.currentState] ?? 'default'}>
          {STATE_LABELS[r.currentState] ?? r.currentState}
        </Tag>
      ),
    },
    {
      title: 'Requested',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Allocations"
        subtitle="Asset allocation workflow"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/allocations/new')}>
            Request Allocation
          </Button>
        }
      />
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search employee, asset tag"
            allowClear
            style={{ width: 300 }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          <Select
            placeholder="Filter by stage"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={Object.entries(STATE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Space>
        <Table<AllocationDto>
          rowKey="id"
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={query.isLoading}
          pagination={{
            current: page,
            pageSize,
            total: query.data?.total ?? 0,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>
    </div>
  );
};
