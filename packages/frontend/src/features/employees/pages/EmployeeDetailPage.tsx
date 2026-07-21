import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Timeline,
  Typography,
  DatePicker,
  message,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmploymentStatusBadge } from '../components/EmploymentStatusBadge';
import {
  useEmployee,
  useEmployeeAssets,
  useEmployeeHistory,
  useChangeEmploymentStatus,
} from '../hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/types/api';
import type { ColumnsType } from 'antd/es/table';
import type { EmployeeAssignedAsset, EmployeeAssetHistoryEntry } from '@/api/employees.api';
import dayjs from 'dayjs';

const TERMINAL_STATUSES = ['terminated', 'resigned'];

export const EmployeeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: employee, isLoading } = useEmployee(id);
  const { data: assets } = useEmployeeAssets(id);
  const { data: history } = useEmployeeHistory(id);
  const changeStatus = useChangeEmploymentStatus(id!);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string | undefined>();
  const [termDate, setTermDate] = useState<dayjs.Dayjs | null>(null);

  const canEdit =
    user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'PEOPLE_CULTURE';
  const canChangeStatus =
    user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'PEOPLE_CULTURE';

  const handleStatusChange = async () => {
    if (!newStatus) return;
    try {
      await changeStatus.mutateAsync({
        status: newStatus,
        terminationDate: termDate ? termDate.format('YYYY-MM-DD') : null,
      });
      messageApi.success('Employment status updated');
      setStatusModalOpen(false);
      setNewStatus(undefined);
      setTermDate(null);
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Status change failed');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!employee) return <Typography.Text>Employee not found</Typography.Text>;

  const assetColumns: ColumnsType<EmployeeAssignedAsset> = [
    { title: 'Asset Tag', dataIndex: 'asset_tag', key: 'asset_tag', render: (v: string, r) => (
      <a onClick={() => nav(`/assets/${r.id}`)} style={{ fontFamily: 'monospace' }}>{v}</a>
    )},
    { title: 'Device Type', dataIndex: 'device_type', key: 'device_type' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={employee.fullName}
        subtitle={`${employee.employeeCode} — ${employee.designation}`}
        actions={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/employees')}>
              Back
            </Button>
            {canEdit && (
              <Button
                icon={<EditOutlined />}
                onClick={() => nav(`/employees/${id}/edit`)}
              >
                Edit
              </Button>
            )}
            {canChangeStatus && (
              <Button onClick={() => setStatusModalOpen(true)}>
                Change Status
              </Button>
            )}
          </Space>
        }
      />

      <Tabs
        defaultActiveKey="profile"
        items={[
          {
            key: 'profile',
            label: 'Profile',
            children: (
              <Card>
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="Employee Code">{employee.employeeCode}</Descriptions.Item>
                  <Descriptions.Item label="Email">{employee.email}</Descriptions.Item>
                  <Descriptions.Item label="Department">{employee.department}</Descriptions.Item>
                  <Descriptions.Item label="Designation">{employee.designation}</Descriptions.Item>
                  <Descriptions.Item label="Office">{employee.officeLocation}</Descriptions.Item>
                  <Descriptions.Item label="Hire Date">{employee.hireDate}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <EmploymentStatusBadge status={employee.employmentStatus} />
                  </Descriptions.Item>
                  {employee.terminationDate && (
                    <Descriptions.Item label="Termination Date">
                      {employee.terminationDate}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="User Account">
                    {employee.userId ? 'Linked' : 'Not linked'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'assets',
            label: `Assigned Assets (${assets?.length ?? 0})`,
            children: (
              <Card>
                <Table<EmployeeAssignedAsset>
                  rowKey="id"
                  columns={assetColumns}
                  dataSource={assets ?? []}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: 'Asset History',
            children: (
              <Card>
                {history && history.length > 0 ? (
                  <Timeline
                    items={history.map((h: EmployeeAssetHistoryEntry) => ({
                      children: (
                        <div>
                          <strong>{h.workflowName}</strong>
                          {h.assetTag && (
                            <span> — {h.assetTag} ({h.deviceType})</span>
                          )}
                          <br />
                          <Typography.Text type="secondary">
                            Stage: {h.currentStage} | Status: {h.status} | {new Date(h.createdAt).toLocaleDateString()}
                          </Typography.Text>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Typography.Text type="secondary">No asset history found</Typography.Text>
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Change Employment Status"
        open={statusModalOpen}
        onOk={handleStatusChange}
        onCancel={() => {
          setStatusModalOpen(false);
          setNewStatus(undefined);
          setTermDate(null);
        }}
        confirmLoading={changeStatus.isPending}
        okButtonProps={{ disabled: !newStatus }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text strong>New Status</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Select status"
              value={newStatus}
              onChange={setNewStatus}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'terminated', label: 'Terminated' },
                { value: 'resigned', label: 'Resigned' },
                { value: 'transferred', label: 'Transferred' },
              ]}
            />
          </div>
          {newStatus && TERMINAL_STATUSES.includes(newStatus) && (
            <div>
              <Typography.Text strong>Termination Date</Typography.Text>
              <DatePicker
                style={{ width: '100%', marginTop: 4 }}
                value={termDate}
                onChange={setTermDate}
              />
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};
