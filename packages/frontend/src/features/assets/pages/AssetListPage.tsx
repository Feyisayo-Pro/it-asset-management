import { useState, type Key } from 'react';
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
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  MoreOutlined,
  PrinterOutlined,
  DownOutlined,
} from '@ant-design/icons';
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetDto[]>([]);
  const [printingLabels, setPrintingLabels] = useState(false);

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

  const printBulkQrLabels = async () => {
    if (selectedAssets.length === 0) return;
    setPrintingLabels(true);
    try {
      const labels = await Promise.all(
        selectedAssets.map(async (a) => ({
          assetTag: a.assetTag,
          deviceLabel: `${a.brand} ${a.model}`,
          url: URL.createObjectURL(await assetsApi.qrBlob(a.id)),
        })),
      );

      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) {
        messageApi.error('Pop-up blocked — allow pop-ups for this site to print QR labels.');
        return;
      }

      // 3x8 sticker sheet (24 labels/page); pages after the first are
      // forced onto new sheets of paper via page-break-after.
      const PER_PAGE = 24;
      const pages: typeof labels[] = [];
      for (let i = 0; i < labels.length; i += PER_PAGE) {
        pages.push(labels.slice(i, i + PER_PAGE));
      }

      const cellHtml = (l: (typeof labels)[number]) => `
        <div class="cell">
          <img src="${l.url}" alt="QR" onload="window.__qrLoaded && window.__qrLoaded()" />
          <div class="tag">${l.assetTag}</div>
          <div class="device">${l.deviceLabel}</div>
        </div>`;

      const pageHtml = (pageLabels: typeof labels) => `
        <div class="sheet">${pageLabels.map(cellHtml).join('')}</div>`;

      win.document.write(`<!doctype html>
        <html>
          <head>
            <title>QR Labels — ${labels.length} asset(s)</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
              .sheet {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-auto-rows: 1fr;
                gap: 0;
                width: 100%;
                height: 100vh;
                page-break-after: always;
              }
              .cell {
                border: 1px dashed #ccc;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 8px;
                text-align: center;
              }
              .cell img { width: 90px; height: 90px; }
              .cell .tag { font-size: 12px; font-weight: 600; margin-top: 4px; }
              .cell .device { font-size: 10px; color: #666; }
              @media print {
                .sheet:last-child { page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            ${pages.map(pageHtml).join('')}
            <script>
              (function () {
                var total = ${labels.length};
                var loaded = 0;
                window.__qrLoaded = function () {
                  loaded += 1;
                  if (loaded >= total) window.print();
                };
              })();
            </script>
          </body>
        </html>`);
      win.document.close();
    } catch {
      messageApi.error('Failed to generate QR labels.');
    } finally {
      setPrintingLabels(false);
    }
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

        {selectedRowKeys.length > 0 && (
          <Space style={{ marginBottom: 16 }}>
            <span>{selectedRowKeys.length} selected</span>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'print-qr',
                    icon: <PrinterOutlined />,
                    label: 'Print Selected QR Labels',
                    onClick: printBulkQrLabels,
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button loading={printingLabels}>
                Bulk Actions <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        )}

        <Table<AssetDto>
          rowKey="id"
          scroll={{ x: 'max-content' }}
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={query.isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedAssets(rows);
            },
          }}
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
