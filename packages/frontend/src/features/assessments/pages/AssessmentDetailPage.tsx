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
  InputNumber,
  Modal,
  Radio,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { PageHeader } from '@/components/PageHeader';
import {
  ALL_CPU_TIERS,
  ALL_ROLE_LEVELS,
  AssessmentOutcome,
  CPU_TIER_LABELS,
  CpuTier,
  evaluateSpec,
  ItemCategory,
  ItemResult,
  ROLE_LEVEL_LABELS,
  RoleLevel,
  TemplateItemDto,
} from '@/api/assessments.api';
import {
  useAssessment,
  useCompleteAssessment,
  useSaveResults,
} from '../hooks/useAssessments';
import { ApiError } from '@/types/api';

// Matches DEVICE ASSESSMENT FORM.docx exactly (3 outcomes).
const OUTCOMES: AssessmentOutcome[] = [
  'NoFaultFound', 'RepairRecommended', 'ReplacementRecommended',
];
const OUTCOME_LABELS: Record<AssessmentOutcome, string> = {
  NoFaultFound: 'No Fault Found',
  RepairRecommended: 'Repair Recommended',
  ReplacementRecommended: 'Replacement Recommended',
};
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
  const [specCheckResult, setSpecCheckResult] = useState<{
    roleLevel: RoleLevel;
    warnings: string[];
  } | null>(null);
  const [form] = Form.useForm();

  // Live client-side spec check as the completion form is filled in —
  // the backend re-validates and is the actual enforcement point (see
  // CompleteAssessmentRecordUseCase), this is purely for instant UI
  // feedback so the override gate can block submission before a round trip.
  const watchedRoleLevel = Form.useWatch('targetRoleLevel', form) as RoleLevel | undefined;
  const watchedCpuTier = Form.useWatch('deviceCpuTier', form) as CpuTier | undefined;
  const watchedRamGb = Form.useWatch('deviceRamGb', form) as number | undefined;
  const watchedStorageGb = Form.useWatch('deviceStorageGb', form) as number | undefined;
  const watchedOverride = Form.useWatch('overrideNonCompliance', form) as boolean | undefined;
  const watchedJustification = Form.useWatch('overrideJustification', form) as string | undefined;

  const liveWarnings =
    watchedRoleLevel && watchedCpuTier && watchedRamGb != null && watchedStorageGb != null
      ? evaluateSpec(watchedRoleLevel, {
          cpuTier: watchedCpuTier,
          ramGb: watchedRamGb,
          storageGb: watchedStorageGb,
        })
      : [];
  const overrideSatisfied = !!watchedOverride && !!watchedJustification?.trim();
  const submitBlocked = liveWarnings.length > 0 && !overrideSatisfied;

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
    targetRoleLevel?: RoleLevel;
    deviceCpuTier?: CpuTier;
    deviceRamGb?: number;
    deviceStorageGb?: number;
    overrideNonCompliance?: boolean;
    overrideJustification?: string;
  }) => {
    if (submitBlocked) {
      messageApi.error('Resolve the hardware spec non-compliance before completing.');
      return;
    }
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

      const result = await complete.mutateAsync({
        outcome: values.outcome,
        findings: values.findings,
        recommendations: values.recommendations,
        photoUrls: values.photoUrls
          ? values.photoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
        signatureName: values.signatureName,
        targetRoleLevel: values.targetRoleLevel,
        deviceCpuTier: values.deviceCpuTier,
        deviceRamGb: values.deviceRamGb,
        deviceStorageGb: values.deviceStorageGb,
        specNonComplianceOverride: liveWarnings.length > 0 ? values.overrideNonCompliance : undefined,
        specOverrideJustification: liveWarnings.length > 0 ? values.overrideJustification : undefined,
      });
      messageApi.success('Assessment completed');
      setCompleteModal(false);
      // The raw specWarnings list isn't persisted on the record (only
      // the override flag + justification are), so this is the only
      // chance to show it; capture it here rather than re-deriving later.
      // Mirror the backend's exact gate (CompleteAssessmentRecordUseCase):
      // it only runs the check when targetRoleLevel AND all three device
      // spec fields are present — a partial fill sends no deviceSpec at
      // all, so warnings would always come back empty and falsely read
      // as "Compliant" if shown without this check.
      if (
        values.targetRoleLevel &&
        values.deviceCpuTier &&
        values.deviceRamGb != null &&
        values.deviceStorageGb != null
      ) {
        setSpecCheckResult({ roleLevel: values.targetRoleLevel, warnings: result.specWarnings });
      } else {
        setSpecCheckResult(null);
      }
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Completion failed');
    }
  };

  const renderItem = (item: TemplateItemDto) => {
    const current = draft[item.code] ?? {};
    return (
      <div
        key={item.code}
        className="checklist-item-grid"
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
          message={`Completed ${a.completedAt ? new Date(a.completedAt).toLocaleString() : ''} — outcome: ${a.outcome ? OUTCOME_LABELS[a.outcome] : '—'}`}
          description={`Signed: ${a.signatureName}${a.signatureIp ? ` (${a.signatureIp})` : ''}`}
        />
      )}
      {specCheckResult && (
        <Alert
          style={{ marginBottom: 16 }}
          type={specCheckResult.warnings.length === 0 ? 'success' : 'warning'}
          showIcon
          message={
            <Space>
              <Tag color={specCheckResult.warnings.length === 0 ? 'green' : 'orange'}>
                {specCheckResult.warnings.length === 0 ? 'Compliant' : 'Non-Compliant'}
              </Tag>
              {`Hardware spec check for ${ROLE_LEVEL_LABELS[specCheckResult.roleLevel]}`}
            </Space>
          }
          description={
            specCheckResult.warnings.length === 0
              ? 'The selected device meets the IT Hardware Specifications Matrix minimum for this role level.'
              : (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {specCheckResult.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )
          }
        />
      )}
      {isDraft && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${answered} of ${items.length} items answered · suggested outcome so far: ${OUTCOME_LABELS[a.suggestedOutcome]}`}
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
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label="Status">
            <Tag color={a.status === 'Completed' ? 'green' : 'gold'}>{a.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Technician">{a.technicianUserId}</Descriptions.Item>
          <Descriptions.Item label="Outcome">{a.outcome ? OUTCOME_LABELS[a.outcome] : '—'}</Descriptions.Item>
          <Descriptions.Item label="Started">
            {new Date(a.startedAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Findings" span={2}>
            {a.findings ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Recommendations" span={2}>
            {a.recommendations ?? '—'}
          </Descriptions.Item>
          {a.specNonComplianceOverride && (
            <Descriptions.Item label="Executive Override" span={2}>
              <Tag color="volcano">Non-compliant spec overridden</Tag>
              <div style={{ marginTop: 4 }}>{a.specOverrideJustification}</div>
            </Descriptions.Item>
          )}
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
          message={`Suggested outcome from checklist: ${OUTCOME_LABELS[a.suggestedOutcome]}`}
        />
        <Form form={form} layout="vertical" onFinish={submitComplete}>
          <Form.Item
            name="outcome"
            label="Outcome"
            rules={[{ required: true, message: 'Select an outcome' }]}
          >
            <Select options={OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o] }))} />
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
            label="Recommendations (required unless outcome is No Fault Found)"
          >
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
          <Form.Item name="photoUrls" label="Photo URLs (optional, one per line)">
            <Input.TextArea rows={2} />
          </Form.Item>

          {a.contextType === 'Allocation' && (
            <>
              <Divider orientation="left" style={{ margin: '12px 0' }}>
                IT Technical Assessment — Hardware Spec Check (optional)
              </Divider>
              <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
                Select the employee's role level and this device's spec to check it
                against the IT Hardware Specifications Matrix. Leave blank to skip —
                nothing else about completion changes either way.
              </Typography.Paragraph>
              <Form.Item name="targetRoleLevel" label="Employee role level">
                <Select
                  allowClear
                  placeholder="Not checked"
                  options={ALL_ROLE_LEVELS.map((r) => ({ value: r, label: ROLE_LEVEL_LABELS[r] }))}
                />
              </Form.Item>
              <Form.Item name="deviceCpuTier" label="Device CPU tier">
                <Select
                  allowClear
                  placeholder="Not checked"
                  options={ALL_CPU_TIERS.map((c) => ({ value: c, label: CPU_TIER_LABELS[c] }))}
                />
              </Form.Item>
              <Space style={{ width: '100%' }} size="middle">
                <Form.Item name="deviceRamGb" label="Device RAM (GB)" style={{ flex: 1 }}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 16" />
                </Form.Item>
                <Form.Item name="deviceStorageGb" label="Device storage (GB)" style={{ flex: 1 }}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 512" />
                </Form.Item>
              </Space>

              {liveWarnings.length > 0 && watchedRoleLevel && (
                <>
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`Hardware Spec Non-Compliant for ${ROLE_LEVEL_LABELS[watchedRoleLevel]}`}
                    description={
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {liveWarnings.map((w) => <li key={w}>{w}</li>)}
                      </ul>
                    }
                  />
                  <Form.Item name="overrideNonCompliance" valuePropName="checked">
                    <Switch checkedChildren="Executive Override ON" unCheckedChildren="Executive Override" />
                  </Form.Item>
                  <Form.Item
                    name="overrideJustification"
                    label="Justification / Override Reason"
                    rules={[
                      {
                        validator: async (_, value) => {
                          if (watchedOverride && !value?.trim()) {
                            throw new Error('A justification is required to override this spec check');
                          }
                        },
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={2}
                      maxLength={2000}
                      disabled={!watchedOverride}
                      placeholder="Explain why this device is being allocated despite not meeting the minimum spec"
                    />
                  </Form.Item>
                </>
              )}
            </>
          )}

          <Form.Item
            name="signatureName"
            label="Digital signature — type your full name"
            rules={[{ required: true, message: 'Signature is required' }]}
          >
            <Input maxLength={255} placeholder="Full legal name" />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={complete.isPending}
              disabled={submitBlocked}
              title={submitBlocked ? 'Enable Executive Override and provide a justification to continue' : undefined}
            >
              Sign & complete
            </Button>
            <Button onClick={() => setCompleteModal(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
