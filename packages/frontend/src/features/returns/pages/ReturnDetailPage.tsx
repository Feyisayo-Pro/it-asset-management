import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { PageHeader } from '@/components/PageHeader';
import {
  AssessmentOutcome,
  ReturnItemStatus,
  ReturnItemType,
} from '@/api/returns.api';
import {
  useCancelReturn,
  useCompleteAssessment,
  useRecordItems,
  useReturn,
  useSignReturn,
} from '../hooks/useReturns';
import { ApiError } from '@/types/api';

const ITEM_TYPES: ReturnItemType[] = [
  'Laptop', 'Phone', 'Charger', 'Mouse', 'Dock', 'Keyboard', 'Monitor', 'Other',
];
const ITEM_STATUSES: ReturnItemStatus[] = ['Returned', 'Missing', 'Damaged'];
const OUTCOMES: AssessmentOutcome[] = [
  'Pass', 'RepairRecommended', 'ReplacementRecommended', 'Reject',
];

interface DraftItem {
  _key: number;
  itemType: ReturnItemType;
  description?: string;
  status: ReturnItemStatus;
  notes?: string;
}

let _nextDraftKey = 1;

export const ReturnDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const query = useReturn(id);
  const recordItems = useRecordItems(id);
  const assess = useCompleteAssessment(id);
  const sign = useSignReturn(id);
  const cancel = useCancelReturn(id);

  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    { _key: _nextDraftKey++, itemType: 'Laptop', status: 'Returned' },
  ]);
  const [signModal, setSignModal] = useState<{
    open: boolean;
    action: 'sign-employee' | 'sign-it' | 'sign-pc' | null;
  }>({ open: false, action: null });
  const [signatureName, setSignatureName] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (query.isLoading || !query.data) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }

  const r = query.data;
  const wf = r.workflow;
  const actions = wf?.availableActions.map((a) => a.actionName) ?? [];
  const stages = (wf?.stages ?? []).filter(
    (s) => s.state !== 'Cancelled',
  );
  const currentIdx = stages.findIndex((s) => s.state === r.currentState);

  const onError = (err: unknown, fallback: string) => {
    messageApi.error((err as ApiError).message || fallback);
  };

  const submitItems = async () => {
    try {
      await recordItems.mutateAsync(draftItems);
      messageApi.success('Items recorded');
    } catch (err) {
      onError(err, 'Failed to record items');
    }
  };

  const submitAssessment = async (values: {
    findings: string;
    outcome: AssessmentOutcome;
    damageNotes?: string;
    missingAccessories?: string;
    photoUrls?: string;
  }) => {
    try {
      await assess.mutateAsync({
        findings: values.findings,
        outcome: values.outcome,
        damageNotes: values.damageNotes,
        missingAccessories: values.missingAccessories,
        photoUrls: values.photoUrls
          ? values.photoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      messageApi.success('Assessment recorded');
    } catch (err) {
      onError(err, 'Failed to record assessment');
    }
  };

  const submitSignature = async () => {
    if (!signModal.action) return;
    try {
      await sign.mutateAsync({
        actionName: signModal.action,
        signatureName,
      });
      messageApi.success('Signed');
      setSignModal({ open: false, action: null });
      setSignatureName('');
    } catch (err) {
      onError(err, 'Signature failed');
    }
  };

  const submitCancel = async () => {
    try {
      await cancel.mutateAsync(cancelReason);
      messageApi.success('Return cancelled');
      setCancelModal(false);
    } catch (err) {
      onError(err, 'Cancel failed');
    }
  };

  const signAction = actions.find((a) => a.startsWith('sign-')) as
    | 'sign-employee' | 'sign-it' | 'sign-pc' | undefined;

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={`Return ${r.id.slice(0, 8)}…`}
        subtitle={`Reason: ${r.reason}`}
        actions={
          actions.includes('cancel') ? (
            <Button danger onClick={() => setCancelModal(true)}>
              Cancel return
            </Button>
          ) : undefined
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Steps
          size="small"
          current={r.currentState === 'Cancelled' ? -1 : currentIdx}
          items={stages.map((s) => ({ title: s.label }))}
        />
        {r.currentState === 'Cancelled' && (
          <Alert style={{ marginTop: 12 }} type="warning" showIcon message="This return was cancelled." />
        )}
        {r.currentState === 'Completed' && (
          <Alert
            style={{ marginTop: 12 }}
            type="success"
            showIcon
            message={`Return completed — assessment outcome: ${r.outcome ?? '—'}. Inventory has been updated.`}
          />
        )}
      </Card>

      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Details">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Asset">{r.assetId}</Descriptions.Item>
            <Descriptions.Item label="Reason">{r.reason}</Descriptions.Item>
            <Descriptions.Item label="Notes">{r.reasonNotes ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="State">
              <Tag>{r.currentState}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Outcome">{r.outcome ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Findings">{r.findings ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Damage notes">{r.damageNotes ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Missing accessories">
              {r.missingAccessories ?? '—'}
            </Descriptions.Item>
          </Descriptions>
          {r.photoUrls && r.photoUrls.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary">Photos</Typography.Text>
              <ul>
                {r.photoUrls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer">{u}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Returned items">
          {r.items.length > 0 ? (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={r.items}
              columns={[
                { title: 'Item', dataIndex: 'itemType' },
                { title: 'Description', dataIndex: 'description', render: (v) => v ?? '—' },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (v: string) => (
                    <Tag color={v === 'Returned' ? 'green' : v === 'Missing' ? 'red' : 'orange'}>
                      {v}
                    </Tag>
                  ),
                },
                { title: 'Notes', dataIndex: 'notes', render: (v) => v ?? '—' },
              ]}
            />
          ) : (
            <Typography.Text type="secondary">No items recorded yet.</Typography.Text>
          )}
        </Card>
      </div>

      {actions.includes('record-items') && (
        <Card title="Record returned items" style={{ marginTop: 16 }}>
          {draftItems.map((item, idx) => (
            <Space key={item._key} style={{ display: 'flex', marginBottom: 8 }} align="start" wrap>
              <Select
                value={item.itemType}
                style={{ width: 140 }}
                options={ITEM_TYPES.map((t) => ({ value: t, label: t }))}
                onChange={(v) =>
                  setDraftItems((d) => d.map((it, i) => (i === idx ? { ...it, itemType: v } : it)))
                }
              />
              <Input
                placeholder="Description"
                style={{ width: 200 }}
                value={item.description}
                onChange={(e) =>
                  setDraftItems((d) =>
                    d.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)),
                  )
                }
              />
              <Select
                value={item.status}
                style={{ width: 130 }}
                options={ITEM_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v) =>
                  setDraftItems((d) => d.map((it, i) => (i === idx ? { ...it, status: v } : it)))
                }
              />
              <Input
                placeholder={item.status !== 'Returned' ? 'Notes (required)' : 'Notes'}
                style={{ width: 240 }}
                value={item.notes}
                onChange={(e) =>
                  setDraftItems((d) =>
                    d.map((it, i) => (i === idx ? { ...it, notes: e.target.value } : it)),
                  )
                }
              />
              <Button
                danger
                type="text"
                disabled={draftItems.length === 1}
                onClick={() => setDraftItems((d) => d.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </Space>
          ))}
          <Space style={{ marginTop: 8 }}>
            <Button
              onClick={() =>
                setDraftItems((d) => [...d, { _key: _nextDraftKey++, itemType: 'Other', status: 'Returned' }])
              }
            >
              Add item
            </Button>
            <Button type="primary" loading={recordItems.isPending} onClick={submitItems}>
              Submit items
            </Button>
          </Space>
        </Card>
      )}

      {actions.includes('complete-assessment') && (
        <Card title="IT post-return assessment" style={{ marginTop: 16 }}>
          <Form layout="vertical" onFinish={submitAssessment} disabled={assess.isPending}>
            <Form.Item
              name="findings"
              label="Findings"
              rules={[{ required: true, message: 'Findings are required' }]}
            >
              <Input.TextArea rows={3} maxLength={5000} />
            </Form.Item>
            <Space size="large" wrap>
              <Form.Item
                name="outcome"
                label="Outcome"
                rules={[{ required: true, message: 'Select an outcome' }]}
              >
                <Select
                  style={{ width: 260 }}
                  options={OUTCOMES.map((o) => ({ value: o, label: o }))}
                />
              </Form.Item>
            </Space>
            <Form.Item name="damageNotes" label="Damage notes (required if items damaged)">
              <Input.TextArea rows={2} maxLength={5000} />
            </Form.Item>
            <Form.Item
              name="missingAccessories"
              label="Missing accessories (required if items missing)"
            >
              <Input.TextArea rows={2} maxLength={5000} />
            </Form.Item>
            <Form.Item name="photoUrls" label="Photo URLs (optional, one per line)">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={assess.isPending}>
              Submit assessment
            </Button>
          </Form>
        </Card>
      )}

      {signAction && (
        <Card title="Signature required" style={{ marginTop: 16 }}>
          <Space direction="vertical">
            <Typography.Text>
              {signAction === 'sign-employee' && 'Employee sign-off confirms the listed items were handed over.'}
              {signAction === 'sign-it' && 'IT sign-off confirms the assessment is accurate.'}
              {signAction === 'sign-pc' && 'P&C sign-off completes the return and updates inventory.'}
            </Typography.Text>
            <Button
              type="primary"
              onClick={() => setSignModal({ open: true, action: signAction })}
            >
              Sign now
            </Button>
          </Space>
        </Card>
      )}

      <Card title="Workflow history" style={{ marginTop: 16 }}>
        {wf && wf.history.length > 0 ? (
          <Timeline
            items={wf.history.map((h) => ({
              children: (
                <>
                  <strong>{h.actionName}</strong> — {h.fromState} → {h.toState}
                  {h.signatureName ? ` · signed: ${h.signatureName}` : ''}
                  {h.comment ? ` · ${h.comment}` : ''}
                  <div>
                    <Typography.Text type="secondary">
                      {new Date(h.occurredAt).toLocaleString()}
                    </Typography.Text>
                  </div>
                </>
              ),
            }))}
          />
        ) : (
          <Typography.Text type="secondary">No transitions yet.</Typography.Text>
        )}
      </Card>

      <Modal
        title="Digital signature"
        open={signModal.open}
        onCancel={() => setSignModal({ open: false, action: null })}
        onOk={submitSignature}
        okText="Sign"
        confirmLoading={sign.isPending}
        okButtonProps={{ disabled: !signatureName.trim() }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>
            Type your full legal name. Your signature is recorded with a timestamp and IP address.
          </Typography.Text>
          <Input
            placeholder="Full name"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            maxLength={255}
          />
        </Space>
      </Modal>

      <Modal
        title="Cancel return"
        open={cancelModal}
        onCancel={() => setCancelModal(false)}
        onOk={submitCancel}
        okText="Cancel return"
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        confirmLoading={cancel.isPending}
      >
        <Input.TextArea
          rows={3}
          placeholder="Reason for cancellation (required)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          maxLength={2000}
        />
      </Modal>
    </div>
  );
};
