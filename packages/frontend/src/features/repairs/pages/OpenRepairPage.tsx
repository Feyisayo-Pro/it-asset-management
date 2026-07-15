import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, InputNumber, Select, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useOpenRepair } from '../hooks/useRepairs';
import { ApiError } from '@/types/api';

/**
 * Assets in these statuses are the ones IT can actually pull for
 * repair — allocated devices reported broken by an employee, returned
 * devices flagged during assessment, or the odd Available spare that
 * failed on the shelf. Others are locked out at this UI layer; the
 * backend still enforces the lifecycle transition.
 */
const REPAIRABLE_STATUSES = ['Allocated', 'Returned', 'Available', 'UnderRepair'];

export const OpenRepairPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const open = useOpenRepair();
  const [banner, setBanner] = useState<string | null>(null);

  const assets = useAssets({ page: 1, pageSize: 200 });
  const options = (assets.data?.data ?? [])
    .filter((a) => REPAIRABLE_STATUSES.includes(a.status))
    .map((a) => ({
      value: a.id,
      label: `${a.assetTag} — ${a.brand} ${a.model} (${a.status})`,
    }));

  const onFinish = async (values: {
    assetId: string;
    reportedFault: string;
    vendor?: string;
    technicianUserId?: string;
    estimatedCost?: number;
    costCurrency?: string;
  }) => {
    setBanner(null);
    try {
      const record = await open.mutateAsync({
        assetId: values.assetId,
        reportedFault: values.reportedFault,
        vendor: values.vendor,
        technicianUserId: values.technicianUserId,
        estimatedCost: values.estimatedCost,
        costCurrency: values.costCurrency,
      });
      messageApi.success('Repair opened');
      nav(`/repairs/${record.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'ACTIVE_REPAIR_EXISTS') {
        setBanner('This asset already has an open repair.');
      } else if (apiErr.code === 'INVALID_ASSET_STATUS_TRANSITION') {
        setBanner('This asset is not in a status that can be sent for repair.');
      } else {
        setBanner(apiErr.message || 'Failed to open repair');
      }
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader title="Open repair" subtitle="Log a new repair or maintenance job" />
      <Card style={{ maxWidth: 720 }}>
        {banner && (
          <Alert type="error" showIcon message={banner} style={{ marginBottom: 16 }} />
        )}
        <Form
          layout="vertical"
          onFinish={onFinish}
          disabled={open.isPending}
          initialValues={{ costCurrency: 'USD' }}
        >
          <Form.Item
            name="assetId"
            label="Asset"
            rules={[{ required: true, message: 'Select the device being repaired' }]}
          >
            <Select
              showSearch
              loading={assets.isLoading}
              placeholder="Search asset tag / serial"
              optionFilterProp="label"
              options={options}
            />
          </Form.Item>
          <Form.Item
            name="reportedFault"
            label="Reported fault"
            rules={[
              { required: true, message: 'Describe the fault' },
              { max: 4000 },
            ]}
          >
            <Input.TextArea rows={4} placeholder="What did the user report?" />
          </Form.Item>
          <Form.Item name="technicianUserId" label="Technician user ID (optional)">
            <Input placeholder="UUID of technician" />
          </Form.Item>
          <Form.Item name="vendor" label="External vendor (optional)">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="estimatedCost" label="Estimated cost">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="costCurrency" label="Currency">
            <Input maxLength={3} style={{ width: 100 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={open.isPending}>
            Open repair
          </Button>
        </Form>
      </Card>
    </div>
  );
};
