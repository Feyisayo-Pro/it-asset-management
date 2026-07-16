import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Select, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { useStartAssessment } from '../hooks/useAssessments';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { AssessmentContextType } from '@/api/assessments.api';
import { ApiError } from '@/types/api';

const CONTEXTS: AssessmentContextType[] = ['Standalone', 'Allocation', 'Return', 'Repair'];

export const StartAssessmentPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const start = useStartAssessment();
  const assets = useAssets({ page: 1, pageSize: 200 });

  const onFinish = async (values: {
    assetId: string;
    contextType?: AssessmentContextType;
    contextId?: string;
  }) => {
    try {
      const record = await start.mutateAsync(values);
      messageApi.success('Assessment started');
      nav(`/assessments/${record.id}`);
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Failed to start assessment');
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="New assessment"
        subtitle="Start a device inspection against the standard checklist"
      />
      <Card style={{ maxWidth: 640 }}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          disabled={start.isPending}
          initialValues={{ contextType: 'Standalone' }}
        >
          <Form.Item
            name="assetId"
            label="Asset"
            rules={[{ required: true, message: 'Select the asset to inspect' }]}
          >
            <Select
              showSearch
              loading={assets.isLoading}
              placeholder="Select an asset"
              optionFilterProp="label"
              options={(assets.data?.data ?? []).map((a) => ({
                value: a.id,
                label: `${a.assetTag} — ${a.brand} ${a.model} (${a.serialNumber})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="contextType" label="Context">
            <Select options={CONTEXTS.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item
            name="contextId"
            label="Context reference (optional — e.g. the return or repair id)"
          >
            <Input maxLength={64} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={start.isPending}>
            Start assessment
          </Button>
        </Form>
      </Card>
    </div>
  );
};
