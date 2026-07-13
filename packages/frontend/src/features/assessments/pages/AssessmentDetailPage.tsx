import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { PageHeader } from '@/components/PageHeader';
import {
  AssessmentOutcome,
  ItemCategory,
  ItemResult,
  TemplateItemDto,
} from '@/api/assessments.api';
import {
  useAssessment,
  useCompleteAssessment,
  useSaveResults,
} from '../hooks/useAssessments';
import { ApiError } from '@/types/api';

const OUTCOMES: AssessmentOutcome[] = [
  'Pass', 'RepairRecommended', 'ReplacementRecommended', 'Reject',
];
const CATEGORIES: ItemCategory[] = ['Hardware', 'Software', 'Condition'];

interface DraftResult {
  result?: ItemResult;
  note?: string;
}

export const AssessmentDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const query = useAssessment(id);
  const saveResults = useSaveResults(id);
  const complete = useCompleteAssessment(id);

  const [draft, setDraft] = useState<Record<string, DraftResult>>({});
  const [completeModal, setCompleteModal] = useState(false);
  const [form] = Form.useForm();

  // Seed local draft from persisted results whenever the record loads.
  useEffect(() => {
    if (!query.data) return;
    const next: Record<string, DraftResult> = {};
    for (const r of query.data.results) {
      next[r.itemCode] = { result: r.result, note: r.note ?? undefined };
    }
    setDraft(next);
  }, [query.data]);

  if (query.isLoading || !query.data) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }

  const a = query.data;
  const isDraft = a.status === 'Draft';
  const items = a.template.items;
  const answered = Object.values(draft).filter((d) => d.result).length;

  const setResult = (code: string, patch: DraftResult) =>
    setDraft((d) => ({ ...d, [code]: { ...d[code], ...patch } }));

  const persistDraft = async () => {
    const entries = Object.entries(draft)
      .filter(([, v]) => v.result)
      .map(([itemCode, v]) => ({
        itemCode,
        result: v.result as ItemResult,
        note: v.note,
      }));
    if (entries.length === 0) {
      messageApi.warning('Answer at least one item first');
      return;
    }
    try {
      await saveResults.mutateAsync(entries);
      messageApi.success('Progress saved');
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Save failed');
    }
  };

  const submitComplete = async (values: {
    outcome: AssessmentOutcome;
    findings: string;
    recommendations?: string;
    photoUrls?: string;
    signatureName: string;
  }) => {
    try {
      // Persist any unsaved item results first so complete() sees them.
      const entries = Object.entries(draft)
        .filter(([, v]) => v.result)
        .map(([itemCode, v]) => ({
          itemCode,
          result: v.result as ItemResult,
          note: v.note,
        }));
      if (entries.length > 0) await saveResults.mutateAsync(entries);

      await complete.mutateAsync({
        outcome: values.outcome,
        findings: values.findings,
        recommendations: values.recommendations,
        photoUrls: values.photoUrls
          ? values.photoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
        signatureName: values.signatureName,
      });
      messageApi.success('Assessment completed');
      setCompleteModal(false);
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Completion failed');
    }
  };

  const renderItem = (item: TemplateItemDto) => {
    const current = draft[item.code] ?? {};
    return (
      <div
        key={item.code}
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 220px 1fr',
          gap: 12,
          alignItems: 'center',
          padding: '6px 0',
        }}
      >
        <Typography.Text>{item.label}</Typography.Text>
        <Radio.Group
          disabled={!isDraft}
          value={current.result}
          onChange={(e) => setResult(item.code, { result: e.target.value })}
          options={[
            { label: 'Pass', value: 'Pass' },
            { label: 'Fail', value: 'Fail' },
            { label: 'N/A', value: 'NA' },
          ]}
          optionType="button"
          buttonStyle="solid"
          size="small"
        />
        <Input
          size="small"
          disabled={!isDraft}
          placeholder={current.result === 'Fail' ? 'Note (required for Fail)' : 'Note'}
          value={current.note}
          status={current.result === 'Fail' && !current.note?.trim() ? 'error' : ''}
          onChange={(e) => setResult(item.code, { note: e.target.value })}
        />
      </div>
    );
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={`Assessment ${a.id.slice(0, 8)}…`}
        subtitle={`${a.template.name} · ${a.contextType}${a.contextId ? ` (${a.contextId.slice(0, 8)}…)` : ''}`}
        actions={
          isDraft ? (
            <>
              <Button onClick={persistDraft} loading={saveResults.isPending}>
                Save progress
              </Button>
              <Button
                type="primary"
                disabled={answered < items.length}
                onClick={() => {
                  form.setFieldValue('outcome', a.suggestedOutcome);
                  setCompleteModal(true);
                }}
              >
                Complete assessment
              </Button>
            </>
          ) : undefined
        }
      />

      {a.status === 'Completed' && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Completed ${a.completedAt ? new Date(a.completedAt).toLocaleString() : ''} — outcome: ${a.outcome}`}
          description={`Signed: ${a.signatureName}${a.signatureIp ? ` (${a.signatureIp})` : ''}`}
        />
      )}
      {isDraft && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${answered} of ${items.length} items answered · suggested outcome so far: ${a.suggestedOutcome}`}
        />
      )}

      <Card title="Checklist">
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat}>
              <Divider orientation="left" style={{ margin: '12px 0' }}>
                {cat}
              </Divider>
              {catItems.map(renderItem)}
            </div>
          );
        })}
      </Card>

      <Card title="Result" style={{ marginTop: 16 }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Status">
            <Tag color={a.status === 'Completed' ? 'green' : 'gold'}>{a.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Technician">{a.technicianUserId}</Descriptions.Item>
          <Descriptions.Item label="Outcome">{a.outcome ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Started">
            {new Date(a.startedAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Findings" span={2}>
            {a.findings ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Recommendations" span={2}>
            {a.recommendations ?? '—'}
          </Descriptions.Item>
        </Descriptions>
        {a.photoUrls && a.photoUrls.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text type="secondary">Photos</Typography.Text>
            <ul>
              {a.photoUrls.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer">{u}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Modal
        title="Complete assessment"
        open={completeModal}
        onCancel={() => setCompleteModal(false)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Suggested outcome from checklist: ${a.suggestedOutcome}`}
        />
        <Form form={form} layout="vertical" onFinish={submitComplete}>
          <Form.Item
            name="outcome"
            label="Outcome"
            rules={[{ required: true, message: 'Select an outcome' }]}
          >
            <Select options={OUTCOMES.map((o) => ({ value: o, label: o }))} />
          </Form.Item>
          <Form.Item
            name="findings"
            label="Findings"
            rules={[{ required: true, message: 'Findings are required' }]}
          >
            <Input.TextArea rows={3} maxLength={5000} />
          </Form.Item>
          <Form.Item
            name="recommendations"
            label="Recommendations (required for non-Pass outcomes)"
          >
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
          <Form.Item name="photoUrls" label="Photo URLs (optional, one per line)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="signatureName"
            label="Digital signature — type your full name"
            rules={[{ required: true, message: 'Signature is required' }]}
          >
            <Input maxLength={255} placeholder="Full legal name" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={complete.isPending}>
              Sign & complete
            </Button>
            <Button onClick={() => setCompleteModal(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
