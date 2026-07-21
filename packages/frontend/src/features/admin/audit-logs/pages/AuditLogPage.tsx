import { useState } from 'react';
import { Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { AuditLogDto } from '@/api/audit-logs.api';
import { useAuditLogs } from '../hooks/useAuditLogs';

const { RangePicker } = DatePicker;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'purple',
  LOGOUT: 'default',
  TRANSITION: 'orange',
  APPROVE: 'cyan',
  REJECT: 'volcano',
  BYPASS: 'magenta',
};

const ENTITY_TYPES = [
  'Asset',
  'User',
  'Employee',
  'Return',
  'Allocation',
  'Assessment',
  'Repair',
  'Disposal',
  'Vendor',
  'Acquisition',
  'WorkflowInstance',
];

export const AuditLogPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const query = useAuditLogs({
    page,
    pageSize,
    entityType,
    action,
    from: dateRange?.[0]?.startOf('day').toISOString(),
    to: dateRange?.[1]?.endOf('day').toISOString(),
  });

  const columns: ColumnsType<AuditLogDto> = [
    {
      title: 'Timestamp',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (v: string) => {
        const base = v.split('.').pop()?.toUpperCase() ?? v;
        return <Tag color={ACTION_COLORS[base] ?? 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 200,
      render: (_, r) => (
        <span>
          <Tag>{r.entityType}</Tag>
          <Typography.Text copyable={{ text: r.entityId }} style={{ fontSize: 12 }}>
            {r.entityId.slice(0, 8)}...
          </Typography.Text>
        </span>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 140,
      render: (v: string) => (
        <Typography.Text copyable={{ text: v }} style={{ fontSize: 12 }}>
          {v.slice(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Correlation ID',
      dataIndex: 'correlationId',
      key: 'correlationId',
      width: 140,
      render: (v: string | null) =>
        v ? (
          <Typography.Text copyable={{ text: v }} style={{ fontSize: 12 }}>
            {v.slice(0, 8)}...
          </Typography.Text>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="System-wide activity audit trail" />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Entity type"
            allowClear
            style={{ width: 180 }}
            onChange={(v) => {
              setEntityType(v);
              setPage(1);
            }}
            options={ENTITY_TYPES.map((t) => ({ label: t, value: t }))}
          />
          <Input
            placeholder="Filter by action"
            allowClear
            style={{ width: 180 }}
            onChange={(e) => {
              setAction(e.target.value || undefined);
              setPage(1);
            }}
          />
          <RangePicker
            onChange={(dates) => {
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
              setPage(1);
            }}
          />
        </Space>
        <Table<AuditLogDto>
          rowKey="id"
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={query.isLoading}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ display: 'flex', gap: 24 }}>
                {record.oldValue && (
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong>Previous Value</Typography.Text>
                    <pre style={{ fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                      {JSON.stringify(record.oldValue, null, 2)}
                    </pre>
                  </div>
                )}
                {record.newValue && (
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong>New Value</Typography.Text>
                    <pre style={{ fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                      {JSON.stringify(record.newValue, null, 2)}
                    </pre>
                  </div>
                )}
                {!record.oldValue && !record.newValue && (
                  <Typography.Text type="secondary">No value changes recorded</Typography.Text>
                )}
              </div>
            ),
          }}
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
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};
