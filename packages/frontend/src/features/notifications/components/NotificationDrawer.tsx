import { useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  List,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { NotificationDto } from '@/api/notifications.api';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '../hooks/useNotifications';

interface Props {
  open: boolean;
  onClose: () => void;
}

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

const EVENT_LABEL: Record<string, string> = {
  ALLOCATION_REQUESTED: 'Allocation Requested',
  ALLOCATION_APPROVED: 'Allocation Approved',
  ALLOCATION_REJECTED: 'Allocation Rejected',
  ASSESSMENT_COMPLETED: 'Assessment Completed',
  ASSET_RETURNED: 'Asset Returned',
  REPAIR_REQUESTED: 'Repair Requested',
  REPAIR_COMPLETED: 'Repair Completed',
  DISPOSAL_APPROVED: 'Disposal Approved',
  ESCALATION: 'Escalation',
  SLA_BREACH: 'SLA Breach',
};

export const NotificationDrawer = ({ open, onClose }: Props) => {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotifications({ page, pageSize: 20, unreadOnly: unreadOnly || undefined });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleMarkRead = (n: NotificationDto) => {
    if (!n.read) {
      markRead.mutate(n.id);
    }
  };

  return (
    <Drawer
      title={
        <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span>Notifications</span>
          <Space>
            <Select
              size="small"
              value={unreadOnly ? 'unread' : 'all'}
              onChange={(v) => { setUnreadOnly(v === 'unread'); setPage(1); }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
              ]}
              style={{ width: 100 }}
            />
            <Button
              size="small"
              icon={<CheckOutlined />}
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              Read all
            </Button>
          </Space>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={420}
    >
      {query.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !query.data?.data.length ? (
        <Empty description="No notifications" />
      ) : (
        <List
          dataSource={query.data.data}
          pagination={{
            current: page,
            pageSize: 20,
            total: query.data.total,
            size: 'small',
            onChange: setPage,
          }}
          renderItem={(n: NotificationDto) => (
            <List.Item
              style={{
                background: n.read ? 'transparent' : '#f0f5ff',
                padding: '12px 16px',
                borderRadius: 6,
                marginBottom: 4,
                cursor: n.read ? 'default' : 'pointer',
              }}
              onClick={() => handleMarkRead(n)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={EVENT_COLOR[n.eventType] ?? 'default'} style={{ fontSize: 11 }}>
                      {EVENT_LABEL[n.eventType] ?? n.eventType}
                    </Tag>
                    <Typography.Text strong={!n.read} style={{ fontSize: 13 }}>
                      {n.subject}
                    </Typography.Text>
                  </Space>
                }
                description={
                  <>
                    <Typography.Paragraph
                      style={{ margin: 0, fontSize: 12 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {n.message}
                    </Typography.Paragraph>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};
