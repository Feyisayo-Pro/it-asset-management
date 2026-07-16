import { Badge, Card, Col, Empty, List, Row, Tag, Typography } from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  WarningOutlined,
  PlusCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { DashboardWidgets as WidgetsData } from '@/api/dashboard.api';
import { RoleName } from '@/types/role';

interface Props {
  widgets: WidgetsData;
  role: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'orange',
  Diagnosing: 'blue',
  AwaitingParts: 'purple',
  InProgress: 'cyan',
  Completed: 'green',
  Failed: 'red',
  BeyondRepair: 'magenta',
  Available: 'green',
  Allocated: 'blue',
  UnderRepair: 'orange',
  Registration: 'default',
  Returned: 'cyan',
  Disposed: 'red',
  Lost: 'volcano',
  Stolen: 'magenta',
};

const EVENT_COLORS: Record<string, string> = {
  ALLOCATION_REQUESTED: 'blue',
  ALLOCATION_APPROVED: 'green',
  ALLOCATION_REJECTED: 'red',
  ASSESSMENT_COMPLETED: 'purple',
  ASSET_RETURNED: 'cyan',
  REPAIR_REQUESTED: 'orange',
  REPAIR_COMPLETED: 'green',
  DISPOSAL_APPROVED: 'magenta',
  ESCALATION: 'volcano',
  SLA_BREACH: 'red',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const DashboardWidgetsPanel = ({ widgets, role }: Props) => {
  const isEmployee = role === RoleName.EMPLOYEE;

  return (
    <Row gutter={[16, 16]}>
      {!isEmployee && (
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={
              <span>
                <HistoryOutlined style={{ marginRight: 8 }} />
                Recent Activity
              </span>
            }
          >
            {widgets.recentActivity.length === 0 ? (
              <Empty description="No recent activity" />
            ) : (
              <List
                size="small"
                dataSource={widgets.recentActivity}
                renderItem={(item) => (
                  <List.Item style={{ padding: '6px 0' }}>
                    <List.Item.Meta
                      title={
                        <span style={{ fontSize: 13 }}>
                          {formatAction(item.action)}
                        </span>
                      }
                      description={
                        <span style={{ fontSize: 12 }}>
                          {item.entityType} &middot; {item.userName} &middot;{' '}
                          <Typography.Text type="secondary">
                            {timeAgo(item.occurredAt)}
                          </Typography.Text>
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      )}

      <Col xs={24} lg={isEmployee ? 24 : 12}>
        <Card
          size="small"
          title={
            <span>
              <BellOutlined style={{ marginRight: 8 }} />
              Notifications
            </span>
          }
        >
          {widgets.notifications.length === 0 ? (
            <Empty description="No notifications" />
          ) : (
            <List
              size="small"
              dataSource={widgets.notifications}
              renderItem={(item) => (
                <List.Item style={{ padding: '6px 0' }}>
                  <List.Item.Meta
                    title={
                      <span style={{ fontSize: 13 }}>
                        {!item.read && (
                          <Badge
                            dot
                            offset={[-4, 0]}
                            style={{ marginRight: 6 }}
                          />
                        )}
                        {item.subject}
                      </span>
                    }
                    description={
                      <span style={{ fontSize: 12 }}>
                        <Tag
                          color={EVENT_COLORS[item.eventType] ?? 'default'}
                          style={{ fontSize: 10 }}
                        >
                          {item.eventType.replace(/_/g, ' ')}
                        </Tag>
                        <Typography.Text type="secondary">
                          {timeAgo(item.createdAt)}
                        </Typography.Text>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card
          size="small"
          title={
            <span>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              Pending Tasks
            </span>
          }
        >
          {widgets.pendingTasks.length === 0 ? (
            <Empty description="No pending tasks" />
          ) : (
            <List
              size="small"
              dataSource={widgets.pendingTasks}
              renderItem={(item) => (
                <List.Item style={{ padding: '6px 0' }}>
                  <List.Item.Meta
                    title={
                      <span style={{ fontSize: 13 }}>
                        {item.workflowName}
                      </span>
                    }
                    description={
                      <span style={{ fontSize: 12 }}>
                        <Tag color="processing">{item.currentState}</Tag>
                        {item.subjectType} &middot;{' '}
                        <Typography.Text type="secondary">
                          {timeAgo(item.createdAt)}
                        </Typography.Text>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      {!isEmployee && (
        <>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={
                <span>
                  <WarningOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  Upcoming Warranty Expirations
                </span>
              }
            >
              {widgets.upcomingWarrantyExpirations.length === 0 ? (
                <Empty description="No upcoming expirations" />
              ) : (
                <List
                  size="small"
                  dataSource={widgets.upcomingWarrantyExpirations}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '6px 0' }}>
                      <List.Item.Meta
                        title={
                          <span style={{ fontSize: 13 }}>
                            {item.assetTag} - {item.brand} {item.model}
                          </span>
                        }
                        description={
                          <span style={{ fontSize: 12 }}>
                            <Tag
                              color={
                                item.daysRemaining <= 7
                                  ? 'red'
                                  : item.daysRemaining <= 30
                                    ? 'orange'
                                    : 'blue'
                              }
                            >
                              {item.daysRemaining} days
                            </Tag>
                            Expires: {item.warrantyExpiry}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={
                <span>
                  <ToolOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                  Recent Repairs
                </span>
              }
            >
              {widgets.recentRepairs.length === 0 ? (
                <Empty description="No recent repairs" />
              ) : (
                <List
                  size="small"
                  dataSource={widgets.recentRepairs}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '6px 0' }}>
                      <List.Item.Meta
                        title={
                          <span style={{ fontSize: 13 }}>
                            {item.assetTag} - {item.brand} {item.model}
                          </span>
                        }
                        description={
                          <span style={{ fontSize: 12 }}>
                            <Tag color={STATUS_COLORS[item.status] ?? 'default'}>
                              {item.status}
                            </Tag>
                            {item.reportedFault?.slice(0, 60)}
                            {item.reportedFault?.length > 60 ? '...' : ''}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={
                <span>
                  <PlusCircleOutlined
                    style={{ marginRight: 8, color: '#34A853' }}
                  />
                  Recently Added Assets
                </span>
              }
            >
              {widgets.recentlyAddedAssets.length === 0 ? (
                <Empty description="No recent assets" />
              ) : (
                <List
                  size="small"
                  dataSource={widgets.recentlyAddedAssets}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '6px 0' }}>
                      <List.Item.Meta
                        title={
                          <span style={{ fontSize: 13 }}>
                            {item.assetTag} - {item.brand} {item.model}
                          </span>
                        }
                        description={
                          <span style={{ fontSize: 12 }}>
                            <Tag
                              color={STATUS_COLORS[item.status] ?? 'default'}
                            >
                              {item.status}
                            </Tag>
                            {item.deviceType} &middot;{' '}
                            <Typography.Text type="secondary">
                              {timeAgo(item.createdAt)}
                            </Typography.Text>
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </>
      )}
    </Row>
  );
};
