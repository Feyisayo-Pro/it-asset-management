import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, message, Space, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { ApiError } from '@/types/api';
import type { UpdateEmployeePayload } from '@/api/employees.api';

export const EmployeeEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: employee, isLoading } = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id!);

  useEffect(() => {
    if (employee) {
      form.setFieldsValue({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        officeLocation: employee.officeLocation,
        managerId: employee.managerId ?? '',
        userId: employee.userId ?? '',
      });
    }
  }, [employee, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload: UpdateEmployeePayload = {
        firstName: values.firstName as string,
        lastName: values.lastName as string,
        email: values.email as string,
        department: values.department as string,
        designation: values.designation as string,
        officeLocation: values.officeLocation as string,
        managerId: (values.managerId as string) || null,
        userId: (values.userId as string) || null,
      };
      await updateEmployee.mutateAsync(payload);
      messageApi.success('Employee updated');
      nav(`/employees/${id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Failed to update employee');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={`Edit ${employee?.fullName ?? 'Employee'}`}
        subtitle={employee?.employeeCode}
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav(`/employees/${id}`)}>
            Back
          </Button>
        }
      />

      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, max: 100 }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, max: 100 }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
          </Space>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', max: 255 }]}
          >
            <Input />
          </Form.Item>

          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item
              name="department"
              label="Department"
              rules={[{ required: true, max: 128 }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="designation"
              label="Designation"
              rules={[{ required: true, max: 100 }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
          </Space>

          <Form.Item
            name="officeLocation"
            label="Office Location"
            rules={[{ required: true, max: 128 }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="managerId" label="Manager ID (UUID)">
            <Input placeholder="Optional — UUID of manager employee" />
          </Form.Item>

          <Form.Item name="userId" label="Link User Account (UUID)">
            <Input placeholder="Optional — UUID of user account to link" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateEmployee.isPending}
              >
                Save Changes
              </Button>
              <Button onClick={() => nav(`/employees/${id}`)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
