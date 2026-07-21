import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Form, Input, message, Space, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useCreateVendor, useUpdateVendor, useVendor } from '../hooks/useVendors';
import { ApiError } from '@/types/api';
import type { CreateVendorPayload } from '@/api/vendors.api';

export const VendorCreatePage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor(id ?? '');
  const { data: vendor, isLoading } = useVendor(isEdit ? id : undefined);

  useEffect(() => {
    if (vendor) {
      form.setFieldsValue({
        name: vendor.name,
        contactPerson: vendor.contactPerson ?? '',
        email: vendor.email ?? '',
        phone: vendor.phone ?? '',
        taxId: vendor.taxId ?? '',
        address: vendor.address ?? '',
        website: vendor.website ?? '',
        notes: vendor.notes ?? '',
      });
    }
  }, [vendor, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload: CreateVendorPayload = {
        name: values.name as string,
        contactPerson: (values.contactPerson as string) || null,
        email: (values.email as string) || null,
        phone: (values.phone as string) || null,
        taxId: (values.taxId as string) || null,
        address: (values.address as string) || null,
        website: (values.website as string) || null,
        notes: (values.notes as string) || null,
      };
      if (isEdit) {
        await updateVendor.mutateAsync(payload);
        messageApi.success('Vendor updated');
        nav(`/vendors/${id}`);
      } else {
        const created = await createVendor.mutateAsync(payload);
        messageApi.success('Vendor created');
        nav(`/vendors/${created.id}`);
      }
    } catch (err) {
      messageApi.error((err as ApiError).message || `Failed to ${isEdit ? 'update' : 'create'} vendor`);
    }
  };

  if (isEdit && isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={isEdit ? `Edit ${vendor?.name ?? 'Vendor'}` : 'Add Vendor'}
        subtitle={isEdit ? 'Update vendor details' : 'Register a new vendor'}
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/vendors')}>Back</Button>
        }
      />
      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, max: 255 }]}>
            <Input />
          </Form.Item>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="contactPerson" label="Contact Person" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="phone" label="Phone" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="taxId" label="Tax ID" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="website" label="Website">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createVendor.isPending || updateVendor.isPending}
              >
                {isEdit ? 'Save Changes' : 'Create Vendor'}
              </Button>
              <Button onClick={() => nav('/vendors')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
