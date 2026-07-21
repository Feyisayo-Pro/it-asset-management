import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Space, Table, Tag, message, Dropdown } from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { VendorDto } from '@/api/vendors.api';
import { useVendors, useDeleteVendor } from '../hooks/useVendors';
import { ApiError } from '@/types/api';

export const VendorListPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const query = useVendors({
    page,
    pageSize,
    search: search || undefined,
  });

  const deleteVendor = useDeleteVendor();

  const handleDelete = async (id: string) => {
    try {
      await deleteVendor.mutateAsync(id);
      messageApi.success('Vendor deleted');
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Delete failed');
    }
  };

  const columns: ColumnsType<VendorDto> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r) => (
        <a onClick={() => nav(`/vendors/${r.id}`)}>{v}</a>
      ),
    },
    { title: 'Contact', dataIndex: 'contactPerson', key: 'contactPerson' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Status',
      key: 'isActive',
      width: 100,
      render: (_, r) => (
        <Tag color={r.isActive ? 'green' : 'default'}>
          {r.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_, r) => (
        <Dropdown
          menu={{
            items: [
              { key: 'view', label: 'View', onClick: () => nav(`/vendors/${r.id}`) },
              { key: 'edit', label: 'Edit', onClick: () => nav(`/vendors/${r.id}/edit`) },
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
        title="Vendors"
        subtitle="Manage vendor registry"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/vendors/new')}>
            Add Vendor
          </Button>
        }
      />
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search name, contact, email"
            allowClear
            style={{ width: 360 }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
        </Space>
        <Table<VendorDto>
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
