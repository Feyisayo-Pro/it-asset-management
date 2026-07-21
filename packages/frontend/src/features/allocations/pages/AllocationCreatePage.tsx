import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, message, Select, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { useCreateAllocation } from '../hooks/useAllocations';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { ApiError } from '@/types/api';

export const AllocationCreatePage = () => {
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const createAllocation = useCreateAllocation();
  const { data: empData } = useEmployees({ page: 1, pageSize: 500 });

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const created = await createAllocation.mutateAsync({
        employeeId: values.employeeId as string,
        justification: (values.justification as string) || null,
      });
      messageApi.success('Allocation request created');
      nav(`/allocations/${created.id}`);
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Failed to create allocation');
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Request Allocation"
        subtitle="Create a new asset allocation request"
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/allocations')}>Back</Button>
        }
      />
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="employeeId"
            label="Employee"
            rules={[{ required: true, message: 'Select an employee' }]}
          >
            <Select
              placeholder="Select employee"
              showSearch
              optionFilterProp="label"
              options={(empData?.data ?? []).map((e) => ({
                label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
                value: e.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="justification" label="Justification">
            <Input.TextArea rows={3} placeholder="Why is this asset needed?" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createAllocation.isPending}
              >
                Submit Request
              </Button>
              <Button onClick={() => nav('/allocations')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
