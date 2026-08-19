import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { AssetStatusBadge } from '../components/AssetStatusBadge';
import { BulkImportModal } from '../components/BulkImportModal';
import { AssetDto, assetsApi } from '@/api/assets.api';
import { useAssets, useDeleteAsset } from '../hooks/useAssets';
import { ApiError } from '@/types/api';

const STATUS_OPTIONS = [
  'Registration',
  'Available',
  'Reserved',
  'Allocated',
  'Returned',
  'UnderRepair',
  'Disposed',
  'Lost',
  'Stolen',
  'Unaccounted',
];

export const AssetListPage = () => {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(
    searchParams.get('status') ?? undefined,
  );
  const [department, setDepartment] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const query = useAssets({
    page,
    pageSize,
    search: search || undefined,
    status,
    department: department || undefined,
    officeLocation: officeLocation || undefined,
    sortField: 'createdAt',
    sortDirection: 'desc',
  });

  const deleteAsset = useDeleteAsset();

  const handleDelete = async (id: string) => {
    try {
      await deleteAsset.mutateAsync(id);
      messageApi.success('Asset deleted');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'INVALID_ASSET_STATUS_TRANSITION') {
        messageApi.error(
          'Only assets still in Registration can be deleted. Dispose the asset instead.',
        );
      } else {
        messageApi.error(apiErr.message || 'Delete failed');
      }
    }
  };

  const handleExport = () => {
    const url = assetsApi.exportUrl({
      page: 1,
      pageSize: 500,
      search: search || undefined,
      status,
      department: department || undefined,
      officeLocation: officeLocation || undefined,
    });
    window.open(url, '_blank');
  };

  const columns: ColumnsType<AssetDto> = [
    {
      title: 'Asset tag',
      dataIndex: 'assetTag',
      key: 'assetTag',
      render: (v: string, r) => (
        <a onClick={() => nav(`/assets/${r.id}`)}>{v}</a>
      ),
    },
    { title: 'Device', key: 'device', render: (_, r) => `${r.brand} ${r.model} (${r.deviceType})` },
    { title: 'Serial', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Assigned to',
      dataIndex: 'assignedEmployeeName',
      key: 'assignedEmployeeName',
      render: (v: string | null) => v ?? '—',
    },
    { title: 'Status', key: 'status', render: (_, r) => <AssetStatusBadge status={r.status} /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_, r) => {
        const items = [
          { key: 'view', label: 'View', onClick: () => nav(`/assets/${r.id}`) },
          { key: 'edit', label: 'Edit', onClick: () => nav(`/assets/${r.id}/edit`) },
          {
            key: 'qr',
            label: 'View QR',
            onClick: async () => {
              const blob = await assetsApi.qrBlob(r.id);
              window.open(URL.createObjectURL(blob), '_blank');
            },
          },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            disabled: r.status !== 'Registration',
            onClick: () => handleDelete(r.id),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Assets"
        subtitle="Complete inventory of company hardware"
        actions={
          <>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export CSV
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/assets/new')}>
              Register asset
            </Button>
          </>
        }
      />

      <Card>
        <Space className="list-filters" style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search tag, serial, IMEI, brand, model"
            allowClear
            style={{ width: 360 }}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <Select
            placeholder="All statuses"
            allowClear
            style={{ width: 200 }}
            value={status}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (v) next.set('status', v);
                else next.delete('status');
                return next;
              });
            }}
          />
          <Input.Search
            placeholder="Department (exact match)"
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => {
              setDepartment(v);
              setPage(1);
            }}
          />
          <Input.Search
            placeholder="Office location (exact match)"
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => {
              setOfficeLocation(v);
              setPage(1);
            }}
          />
        </Space>
        <Table<AssetDto>
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
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
