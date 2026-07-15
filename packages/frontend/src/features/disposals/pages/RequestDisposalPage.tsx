import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Select, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import {
  DISPOSAL_METHODS,
  DISPOSAL_REASONS,
  DisposalMethod,
  DisposalReason,
} from '@/api/disposals.api';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useRequestDisposal } from '../hooks/useDisposals';
import { ApiError } from '@/types/api';

const linesToUrls = (input: string | undefined): string[] =>
  input
    ? input
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

export const RequestDisposalPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const request = useRequestDisposal();
  const [banner, setBanner] = useState<string | null>(null);

  const assets = useAssets({ page: 1, pageSize: 200 });
  // Disposed assets are hidden — everything else may be candidate.
  const options = (assets.data?.data ?? [])
    .filter((a) => a.status !== 'Disposed')
    .map((a) => ({
      value: a.id,
      label: `${a.assetTag} — ${a.brand} ${a.model} (${a.status})`,
    }));

  const onFinish = async (values: {
    assetId: string;
    reason: DisposalReason;
    method: DisposalMethod;
    requestNotes?: string;
    evidenceUrls?: string;
    photoUrls?: string;
  }) => {
    setBanner(null);
    const evidence = linesToUrls(values.evidenceUrls);
    const photos = linesToUrls(values.photoUrls);
    if (evidence.length + photos.length === 0) {
      setBanner('Provide at least one evidence URL or photo URL.');
      return;
    }
    try {
      const record = await request.mutateAsync({
        assetId: values.assetId,
        reason: values.reason,
        method: values.method,
        requestNotes: values.requestNotes,
        evidenceUrls: evidence,
        photoUrls: photos,
      });
      messageApi.success('Disposal requested — awaiting approval');
      nav(`/disposals/${record.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'ACTIVE_DISPOSAL_EXISTS') {
        setBanner('This asset already has a pending disposal request.');
      } else if (apiErr.code === 'ASSET_ALREADY_DISPOSED') {
        setBanner('This asset is already disposed.');
      } else if (apiErr.code === 'DISPOSAL_EVIDENCE_REQUIRED') {
        setBanner('Provide at least one evidence URL or photo URL.');
      } else {
        setBanner(apiErr.message || 'Failed to request disposal');
      }
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Request disposal"
        subtitle="Once approved, the asset is permanently removed from active inventory."
      />
      <Card style={{ maxWidth: 760 }}>
        {banner && <Alert type="error" showIcon message={banner} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} disabled={request.isPending}>
          <Form.Item
            name="assetId"
            label="Asset"
            rules={[{ required: true, message: 'Select the asset to dispose' }]}
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
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Select a reason' }]}
          >
            <Select options={DISPOSAL_REASONS.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item
            name="method"
            label="Method"
            rules={[{ required: true, message: 'Select a disposal method' }]}
          >
            <Select options={DISPOSAL_METHODS.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="requestNotes" label="Request notes (optional)">
            <Input.TextArea rows={3} maxLength={4000} />
          </Form.Item>
          <Form.Item
            name="evidenceUrls"
            label="Evidence URLs (vendor quotes, incident reports — one per line)"
          >
            <Input.TextArea rows={3} placeholder="https://…" />
          </Form.Item>
          <Form.Item
            name="photoUrls"
            label="Photo URLs (one per line)"
            extra="At least one evidence or photo URL is required."
          >
            <Input.TextArea rows={3} placeholder="https://…" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={request.isPending}>
            Submit request
          </Button>
        </Form>
      </Card>
    </div>
  );
};
