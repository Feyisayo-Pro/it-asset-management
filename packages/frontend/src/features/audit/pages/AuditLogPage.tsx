import { useState } from 'react';
import { Card, Collapse, DatePicker, Descriptions, Drawer, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { AuditLogEntryDto } from '@/api/audit.api';
import { useAuditLogs } from '../hooks/useAuditLogs';

/** True when every top-level value is a primitive — safe to render as a
 *  flat key/value list instead of a raw JSON block. */
const isFlatObject = (val: Record<string, unknown>): boolean =>
  Object.values(val).every(
    (v) => v === null || (typeof v !== 'object' && typeof v !== 'function'),
  );

const ValueBlock = ({ value, label }: { value: Record<string, unknown> | null; label: string }) => {
  if (!value) return <Tag>None</Tag>;
  if (isFlatObject(value)) {
    return (
      <Descriptions bordered size="small" column={1} style={{ marginTop: 4 }}>
        {Object.entries(value).map(([k, v]) => (
          <Descriptions.Item key={k} label={k}>
            {v === null || v === undefined ? <Tag>None</Tag> : String(v)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  }
  return (
    <pre
      style={{
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        padding: 10,
        borderRadius: 6,
        overflowX: 'auto',
        fontSize: 12,
        marginTop: 4,
      }}
      aria-label={label}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

/**
 * Full audit trail (actor, action, entity, old/new value, IP,
 * correlation ID) — distinct from /activity, which is a notification
 * feed. Backend: GET /audit-logs (SUPER_ADMIN + audit:read only, see
 * modules/audit/presentation/audit.controller.ts). Every write in the
 * system emits one of these asynchronously (CLAUDE.md "Audit Logging").
 */
export const AuditLogPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [detail, setDetail] = useState<AuditLogEntryDto | null>(null);

  const query = useAuditLogs({
    page,
    pageSize,
    userId: userId || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    action: action || undefined,
    from: range?.[0] ? range[0].startOf('day').toISOString() : undefined,
    to: range?.[1] ? range[1].endOf('day').toISOString() : undefined,
  });

  const resetToFirstPage = () => setPage(1);

  const columns: ColumnsType<AuditLogEntryDto> = [
    {
      title: 'Occurred',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: 'Entity',
      key: 'entity',
      render: (_, r) => {
        if (r.action === 'asset.bulk-imported') {
          const count = typeof r.newValue?.count === 'number' ? r.newValue.count : undefined;
          return (
            <Tag color="blue">
              Bulk Import {count !== undefined ? `(${count} assets)` : '(Multiple Entities)'}
            </Tag>
          );
        }
        return (
          <span>
            {r.entityType ?? '—'}{' '}
            <Typography.Text type="secondary">
              {r.entityId ? `${r.entityId.slice(0, 8)}…` : '—'}
            </Typography.Text>
          </span>
        );
      },
    },
    {
      title: 'Actor',
      dataIndex: 'userId',
      key: 'userId',
      render: (v: string | null) => (v ? `${v.slice(0, 8)}…` : <Typography.Text type="secondary">system</Typography.Text>),
    },
    { title: 'IP', dataIndex: 'ip', key: 'ip', render: (v: string | null) => v ?? '—' },
    {
      title: 'Correlation ID',
      dataIndex: 'correlationId',
      key: 'correlationId',
      render: (v: string | null) => (v ? `${v.slice(0, 8)}…` : '—'),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Full write-action audit trail — every create/update/status-change in the system" />

      <Card>
        <Space className="list-filters" style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Actor user ID (UUID)"
            allowClear
            style={{ width: 220 }}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onPressEnter={resetToFirstPage}
            onBlur={resetToFirstPage}
          />
          <Input
            placeholder="Entity type, e.g. Asset"
            allowClear
            style={{ width: 180 }}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            onPressEnter={resetToFirstPage}
            onBlur={resetToFirstPage}
          />
          <Input
            placeholder="Entity ID (UUID)"
            allowClear
            style={{ width: 220 }}
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            onPressEnter={resetToFirstPage}
            onBlur={resetToFirstPage}
          />
          <Input
            placeholder="Action, e.g. asset.status-changed"
            allowClear
            style={{ width: 220 }}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onPressEnter={resetToFirstPage}
            onBlur={resetToFirstPage}
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => {
              setRange(v as [Dayjs | null, Dayjs | null] | null);
              resetToFirstPage();
            }}
          />
        </Space>

        <Table<AuditLogEntryDto>
          rowKey="id"
          scroll={{ x: 'max-content' }}
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={query.isLoading}
          onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
          pagination={{
            current: page,
            pageSize,
            total: query.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          locale={{
            emptyText: query.isLoading ? 'Loading audit log…' : 'No audit entries match your filters.',
          }}
        />
      </Card>

      <Drawer
        title="Audit entry"
        open={!!detail}
        onClose={() => setDetail(null)}
        width={520}
      >
        {detail && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Typography.Text type="secondary">Occurred</Typography.Text>
              <div>{dayjs(detail.occurredAt).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Action</Typography.Text>
              <div><Tag>{detail.action}</Tag></div>
            </div>
            <div>
              <Typography.Text type="secondary">Entity</Typography.Text>
              <div>
                {detail.entityType ?? '—'}
                {detail.entityId ? (
                  <>
                    {' — '}
                    <Typography.Text code copyable>
                      {detail.entityId}
                    </Typography.Text>
                  </>
                ) : null}
              </div>
            </div>

            <div>
              <Typography.Text strong>Actor</Typography.Text>
              <div>{detail.userId ?? <Typography.Text type="secondary">system</Typography.Text>}</div>
            </div>
            <div>
              <Typography.Text strong>Actor IP</Typography.Text>
              <div>
                {detail.ip ? <Typography.Text code copyable>{detail.ip}</Typography.Text> : <Tag>None</Tag>}
              </div>
            </div>
            <div>
              <Typography.Text strong>Correlation ID</Typography.Text>
              <div>
                {detail.correlationId ? (
                  <Typography.Text code copyable>
                    {detail.correlationId}
                  </Typography.Text>
                ) : (
                  <Tag>None</Tag>
                )}
              </div>
            </div>

            <Collapse
              size="small"
              items={[
                {
                  key: 'ua',
                  label: 'Technical Metadata',
                  children: detail.userAgent ? (
                    <Typography.Text style={{ wordBreak: 'break-all', fontSize: 12 }}>
                      {detail.userAgent}
                    </Typography.Text>
                  ) : (
                    <Tag>None</Tag>
                  ),
                },
              ]}
            />

            <div>
              <Typography.Text strong>Old value</Typography.Text>
              <ValueBlock value={detail.oldValue} label="Old value" />
            </div>
            <div>
              <Typography.Text strong>New value</Typography.Text>
              <ValueBlock value={detail.newValue} label="New value" />
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};
