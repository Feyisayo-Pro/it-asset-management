import { useState } from 'react';
import { Card, Empty, List, Select, Skeleton, Space, Tag, Typography } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { NotificationDto } from '@/api/notifications.api';
import { useNotifications } from '../hooks/useNotifications';

const EVENT_TYPES = [
  'ALLOCATION_REQUESTED',
  'ALLOCATION_APPROVED',
  'ALLOCATION_REJECTED',
  'ASSESSMENT_COMPLETED',
  'ASSET_RETURNED',
  'REPAIR_REQUESTED',
  'REPAIR_COMPLETED',
  'DISPOSAL_APPROVED',
  'ESCALATION',
  'SLA_BREACH',
];

const EVENT_COLOR: Record<string, string> = {
  ALLOCATION_REQUESTED: 'blue',
  ALLOCATION_APPROVED: 'green',
  ALLOCATION_REJECTED: 'red',
  ASSESSMENT_COMPLETED: 'cyan',
  ASSET_RETURNED: 'orange',
  REPAIR_REQUESTED: 'purple',
  REPAIR_COMPLETED: 'green',
  DISPOSAL_APPROVED: 'volcano',
  ESCALATION: 'magenta',
  SLA_BREACH: 'red',
};

export const ActivityFeedPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [eventType, setEventType] = useState<string | undefined>();

  const query = useNotifications({ page, pageSize, eventType });

  return (
    <div>
      <PageHeader title="Activity Feed" subtitle="All notification activity" />
      <Card>
        <Space className="list-filters" style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="All event types"
            allowClear
            style={{ width: 280 }}
            value={eventType}
            onChange={(v) => { setEventType(v); setPage(1); }}
            options={EVENT_TYPES.map((t) => ({
              value: t,
              label: t.replace(/_/g, ' '),
            }))}
          />
        </Space>

        {query.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : !query.data?.data.length ? (
          <Empty description="No activity yet" />
        ) : (
          <List
            dataSource={query.data.data}
            pagination={{
              current: page,
              pageSize,
              total: query.data.total,
              showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
            renderItem={(n: NotificationDto) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={EVENT_COLOR[n.eventType] ?? 'default'}>
                        {n.eventType.replace(/_/g, ' ')}
                      </Tag>
                      <Typography.Text strong>{n.subject}</Typography.Text>
                    </Space>
                  }
                  description={
                    <>
                      <div>{n.message}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
