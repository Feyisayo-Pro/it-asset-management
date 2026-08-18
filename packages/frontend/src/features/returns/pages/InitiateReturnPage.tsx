import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Select, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { useInitiateReturn } from '../hooks/useReturns';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { ReturnReason } from '@/api/returns.api';
import { ApiError } from '@/types/api';

const REASONS: ReturnReason[] = [
  'Resignation', 'Termination', 'Transfer', 'Replacement', 'Repair', 'Lost', 'Other',
];

export const InitiateReturnPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const initiate = useInitiateReturn();
  const [banner, setBanner] = useState<string | null>(null);

  // Only allocated assets can be returned.
  const allocatedAssets = useAssets({
    page: 1,
    pageSize: 200,
    status: 'Allocated',
  });

  const onFinish = async (values: {
    assetId: string;
    reason: ReturnReason;
    reasonNotes?: string;
  }) => {
    setBanner(null);
    try {
      const record = await initiate.mutateAsync(values);
      messageApi.success('Return initiated');
      nav(`/returns/${record.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'ACTIVE_RETURN_EXISTS')
        setBanner('An active return already exists for this asset.');
      else if (apiErr.code === 'NOT_ASSET_HOLDER')
        setBanner('You can only return assets assigned to you.');
      else if (apiErr.code === 'ASSET_NOT_RETURNABLE')
        setBanner('Only allocated assets can be returned.');
      else setBanner(apiErr.message || 'Failed to initiate return');
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader title="Initiate return" subtitle="Start an asset return workflow" />
      <Card style={{ maxWidth: 640 }}>
        {banner && <Alert type="error" showIcon message={banner} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} disabled={initiate.isPending}>
          <Form.Item
            name="assetId"
            label="Asset"
            rules={[{ required: true, message: 'Select the asset being returned' }]}
          >
            <Select
              showSearch
              loading={allocatedAssets.isLoading}
              placeholder="Select an allocated asset"
              optionFilterProp="label"
              options={(allocatedAssets.data?.data ?? []).map((a) => ({
                value: a.id,
                label: `${a.assetTag} — ${a.brand} ${a.model} (${a.serialNumber})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Select a reason' }]}
          >
            <Select options={REASONS.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item name="reasonNotes" label="Notes (optional)">
            <Input.TextArea rows={3} maxLength={2000} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={initiate.isPending}>
            Initiate return
          </Button>
        </Form>
      </Card>
    </div>
  );
};
