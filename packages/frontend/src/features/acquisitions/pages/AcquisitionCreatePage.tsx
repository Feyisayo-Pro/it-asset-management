import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import {
  useCreateAcquisition,
  useUpdateAcquisition,
  useAcquisition,
} from '../hooks/useAcquisitions';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { ApiError } from '@/types/api';
import type { CreateAcquisitionPayload } from '@/api/acquisitions.api';

export const AcquisitionCreatePage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const createAcq = useCreateAcquisition();
  const updateAcq = useUpdateAcquisition(id ?? '');
  const { data: acq, isLoading } = useAcquisition(isEdit ? id : undefined);
  const { data: vendorsData } = useVendors({ page: 1, pageSize: 500 });

  useEffect(() => {
    if (acq) {
      form.setFieldsValue({
        vendorId: acq.vendorId ?? undefined,
        invoiceNumber: acq.invoiceNumber ?? '',
        purchaseDate: acq.purchaseDate ? dayjs(acq.purchaseDate) : undefined,
        warrantyMonths: acq.warrantyMonths,
        unitCostDollars: acq.unitCostCents != null ? acq.unitCostCents / 100 : undefined,
        currency: acq.currency,
        quantity: acq.quantity,
        notes: acq.notes ?? '',
      });
    }
  }, [acq, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const dollars = values.unitCostDollars as number | undefined;
      const payload: CreateAcquisitionPayload = {
        vendorId: (values.vendorId as string) || null,
        invoiceNumber: (values.invoiceNumber as string) || null,
        purchaseDate: values.purchaseDate
          ? (values.purchaseDate as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        warrantyMonths: (values.warrantyMonths as number) ?? null,
        unitCostCents: dollars != null ? Math.round(dollars * 100) : null,
        currency: (values.currency as string) || 'USD',
        quantity: (values.quantity as number) || 1,
        notes: (values.notes as string) || null,
      };
      if (isEdit) {
        await updateAcq.mutateAsync(payload);
        messageApi.success('Acquisition updated');
        nav(`/acquisitions/${id}`);
      } else {
        const created = await createAcq.mutateAsync(payload);
        messageApi.success('Acquisition created');
        nav(`/acquisitions/${created.id}`);
      }
    } catch (err) {
      messageApi.error(
        (err as ApiError).message || `Failed to ${isEdit ? 'update' : 'create'} acquisition`,
      );
    }
  };

  if (isEdit && isLoading)
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={isEdit ? 'Edit Acquisition' : 'New Acquisition'}
        subtitle={isEdit ? 'Update procurement record' : 'Record a new procurement'}
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/acquisitions')}>
            Back
          </Button>
        }
      />
      <Card style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ currency: 'USD', quantity: 1 }}
        >
          <Form.Item name="vendorId" label="Vendor">
            <Select
              placeholder="Select vendor"
              allowClear
              showSearch
              optionFilterProp="label"
              options={(vendorsData?.data ?? []).map((v) => ({
                label: v.name,
                value: v.id,
              }))}
            />
          </Form.Item>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="invoiceNumber" label="Invoice #" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="purchaseDate" label="Purchase Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="unitCostDollars" label="Unit Cost" style={{ flex: 1 }}>
              <InputNumber
                prefix="$"
                min={0}
                precision={2}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="currency" label="Currency" style={{ flex: 1 }}>
              <Select
                options={[
                  { label: 'USD', value: 'USD' },
                  { label: 'EUR', value: 'EUR' },
                  { label: 'GBP', value: 'GBP' },
                  { label: 'NGN', value: 'NGN' },
                ]}
              />
            </Form.Item>
          </Space>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="quantity" label="Quantity" style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="warrantyMonths" label="Warranty (months)" style={{ flex: 1 }}>
              <InputNumber min={0} max={600} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createAcq.isPending || updateAcq.isPending}
              >
                {isEdit ? 'Save Changes' : 'Create Acquisition'}
              </Button>
              <Button onClick={() => nav('/acquisitions')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
