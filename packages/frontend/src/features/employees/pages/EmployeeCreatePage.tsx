import { useNavigate } from 'react-router-dom';
import { Button, Card, DatePicker, Form, Input, message, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { useCreateEmployee } from '../hooks/useEmployees';
import { ApiError } from '@/types/api';
import type { CreateEmployeePayload } from '@/api/employees.api';
import dayjs from 'dayjs';

export const EmployeeCreatePage = () => {
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const createEmployee = useCreateEmployee();

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload: CreateEmployeePayload = {
        employeeCode: values.employeeCode as string,
        firstName: values.firstName as string,
        lastName: values.lastName as string,
        email: values.email as string,
        department: values.department as string,
        designation: values.designation as string,
        officeLocation: values.officeLocation as string,
        hireDate: (values.hireDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        managerId: (values.managerId as string) || null,
        userId: (values.userId as string) || null,
      };
      const employee = await createEmployee.mutateAsync(payload);
      messageApi.success('Employee created');
      nav(`/employees/${employee.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Failed to create employee');
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Add Employee"
        subtitle="Register a new employee"
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/employees')}>
            Back
          </Button>
        }
      />

      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Form.Item
              name="employeeCode"
              label="Employee Code"
              rules={[{ required: true, max: 50 }]}
            >
              <Input placeholder="e.g. EMP-001" />
            </Form.Item>

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

            <Space size="middle" style={{ display: 'flex' }}>
              <Form.Item
                name="officeLocation"
                label="Office Location"
                rules={[{ required: true, max: 128 }]}
                style={{ flex: 1 }}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="hireDate"
                label="Hire Date"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Space>

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
                  loading={createEmployee.isPending}
                >
                  Create Employee
                </Button>
                <Button onClick={() => nav('/employees')}>Cancel</Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>
    </div>
  );
};
