import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Space, Table, Tag, message, Dropdown } from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { AcquisitionDto } from '@/api/acquisitions.api';
import { useAcquisitions, useDeleteAcquisition } from '../hooks/useAcquisitions';
import { ApiError } from '@/types/api';

const formatCurrency = (cents: number | null, currency: string) => {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
};

export const AcquisitionListPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const query = useAcquisitions({
    page,
    pageSize,
    search: search || undefined,
  });

  const deleteAcq = useDeleteAcquisition();

  const handleDelete = async (id: string) => {
    try {
      await deleteAcq.mutateAsync(id);
      messageApi.success('Acquisition deleted');
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Delete failed');
    }
  };

  const columns: ColumnsType<AcquisitionDto> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v: string | null, r) => (
        <a onClick={() => nav(`/acquisitions/${r.id}`)}>{v || '—'}</a>
      ),
    },
    {
      title: 'Vendor',
      dataIndex: 'vendorName',
      key: 'vendorName',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Purchase Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Unit Cost',
      key: 'unitCostCents',
      render: (_, r) => formatCurrency(r.unitCostCents, r.currency),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: 'Warranty',
      key: 'warrantyMonths',
      render: (_, r) =>
        r.warrantyMonths != null ? (
          <Tag>{r.warrantyMonths} mo</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Assets',
      key: 'assets',
      width: 80,
      render: (_, r) => r.assetIds.length,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, r) => (
        <Dropdown
          menu={{
            items: [
              { key: 'view', label: 'View', onClick: () => nav(`/acquisitions/${r.id}`) },
              { key: 'edit', label: 'Edit', onClick: () => nav(`/acquisitions/${r.id}/edit`) },
              { key: 'del', label: 'Delete', danger: true, onClick: () => handleDelete(r.id) },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Acquisitions"
        subtitle="Track procurement records"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/acquisitions/new')}>
            New Acquisition
          </Button>
        }
      />
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search invoice, vendor, notes"
            allowClear
            style={{ width: 360 }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
        </Space>
        <Table<AcquisitionDto>
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
