import { useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Row, Tag, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { employeesApi } from '@/api/employees.api';
import { client } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_COLOR, ROLE_LABEL, RoleName } from '@/types/role';
import { PageHeader } from '@/components/PageHeader';
import { ApiError } from '@/types/api';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [changingPassword, setChangingPassword] = useState(false);
  const [form] = Form.useForm();

  const roleName = user?.roleName as RoleName;

  const { data: employeeProfile } = useQuery({
    queryKey: queryKeys.employees.me,
    queryFn: () => employeesApi.getMyProfile(),
  });

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await client.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      messageApi.success('Password changed successfully');
      form.resetFields();
      setChangingPassword(false);
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Failed to change password');
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader title="My Profile" subtitle="Account details and security" />

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Account Information" style={{ marginBottom: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color={ROLE_COLOR[roleName]}>{ROLE_LABEL[roleName] ?? roleName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="User ID">
                {user?.id}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {employeeProfile && (
            <Card title="Employee Profile" style={{ marginBottom: 16 }}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Employee Code">
                  {employeeProfile.employeeCode}
                </Descriptions.Item>
                <Descriptions.Item label="Name">
                  {employeeProfile.fullName}
                </Descriptions.Item>
                <Descriptions.Item label="Department">
                  {employeeProfile.department}
                </Descriptions.Item>
                <Descriptions.Item label="Designation">
                  {employeeProfile.designation}
                </Descriptions.Item>
                <Descriptions.Item label="Office Location">
                  {employeeProfile.officeLocation}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={employeeProfile.employmentStatus === 'Active' ? 'green' : 'default'}>
                    {employeeProfile.employmentStatus}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Change Password"
            extra={
              !changingPassword && (
                <Button
                  type="link"
                  icon={<LockOutlined />}
                  onClick={() => setChangingPassword(true)}
                >
                  Change
                </Button>
              )
            }
          >
            {changingPassword ? (
              <Form form={form} layout="vertical" onFinish={handleChangePassword}>
                <Form.Item
                  name="currentPassword"
                  label="Current Password"
                  rules={[{ required: true, message: 'Enter current password' }]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="New Password"
                  rules={[
                    { required: true, message: 'Enter new password' },
                    { min: 8, message: 'Minimum 8 characters' },
                  ]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="Confirm New Password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Confirm new password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                    Update Password
                  </Button>
                  <Button onClick={() => { setChangingPassword(false); form.resetFields(); }}>
                    Cancel
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <p>Click "Change" above to update your password.</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
