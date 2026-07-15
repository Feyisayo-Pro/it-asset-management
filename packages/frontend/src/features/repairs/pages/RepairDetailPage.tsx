import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Space,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { PageHeader } from '@/components/PageHeader';
import {
  REPAIR_STATUSES,
  RepairStatus,
} from '@/api/repairs.api';
import {
  useRepair,
  useTransitionRepair,
  useUpdateRepair,
} from '../hooks/useRepairs';
import { ApiError } from '@/types/api';

const STATUS_COLOR: Record<RepairStatus, string> = {
  Pending: 'gold',
  Diagnosing: 'blue',
  AwaitingParts: 'orange',
  InProgress: 'geekblue',
  Completed: 'green',
  Failed: 'volcano',
  BeyondRepair: 'red',
};

const ALLOWED_NEXT: Record<RepairStatus, RepairStatus[]> = {
  Pending: ['Diagnosing', 'BeyondRepair'],
  Diagnosing: ['AwaitingParts', 'InProgress', 'BeyondRepair'],
  AwaitingParts: ['InProgress', 'BeyondRepair'],
  InProgress: ['Completed', 'Failed', 'BeyondRepair'],
  Failed: ['InProgress', 'BeyondRepair'],
  Completed: [],
  BeyondRepair: [],
};

const money = (v: number | null, ccy: string) =>
  v == null ? '—' : `${ccy} ${v.toFixed(2)}`;

export const RepairDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const query = useRepair(id);
  const transition = useTransitionRepair(id);
  const update = useUpdateRepair(id);

  const [transitionModal, setTransitionModal] = useState<{
    open: boolean;
    to: RepairStatus | null;
  }>({ open: false, to: null });
  const [transitionForm] = Form.useForm();

  if (query.isLoading || !query.data) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }
  const r = query.data;
  const allowedNext = ALLOWED_NEXT[r.status];
  const terminal = allowedNext.length === 0;

  const submitTransition = async () => {
    const values = await transitionForm.validateFields();
    try {
      await transition.mutateAsync({
        toStatus: transitionModal.to!,
        diagnosis: values.diagnosis,
        resolutionNotes: values.resolutionNotes,
        actualCost:
          values.actualCost === undefined || values.actualCost === '' ? undefined : Number(values.actualCost),
        note: values.note,
      });
      messageApi.success(`Moved to ${transitionModal.to}`);
      setTransitionModal({ open: false, to: null });
      transitionForm.resetFields();
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Transition failed');
    }
  };

  const submitAssignmentUpdate = async (values: {
    technicianUserId?: string;
    vendor?: string;
    estimatedCost?: number | string;
  }) => {
    try {
      await update.mutateAsync({
        technicianUserId: values.technicianUserId ?? null,
        vendor: values.vendor ?? null,
        estimatedCost:
          values.estimatedCost === undefined || values.estimatedCost === ''
            ? null
            : Number(values.estimatedCost),
      });
      messageApi.success('Repair updated');
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Update failed');
    }
  };

  const needsCompletionFields = transitionModal.to === 'Completed';

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={`Repair ${r.id.slice(0, 8)}…`}
        subtitle={`Asset ${r.assetId.slice(0, 8)}… · ${r.reportedFault.slice(0, 60)}${
          r.reportedFault.length > 60 ? '…' : ''
        }`}
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Tag color={STATUS_COLOR[r.status]} style={{ fontSize: 14, padding: '4px 10px' }}>
            {r.status}
          </Tag>
          {r.warrantyActiveAtIntake && <Tag color="green">Warranty at intake</Tag>}
          {allowedNext.length > 0
            ? REPAIR_STATUSES.filter((s) => allowedNext.includes(s)).map((s) => (
                <Button
                  key={s}
                  onClick={() => setTransitionModal({ open: true, to: s })}
                  type={s === 'Completed' ? 'primary' : 'default'}
                  danger={s === 'BeyondRepair' || s === 'Failed'}
                >
                  Move to {s}
                </Button>
              ))
            : (
              <Alert
                type={r.status === 'Completed' ? 'success' : 'warning'}
                showIcon
                message={
                  r.status === 'Completed'
                    ? 'Repair completed — asset flipped back to Available.'
                    : 'Beyond repair — open a disposal request from the asset page.'
                }
              />
            )}
        </Space>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Details">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Asset">{r.assetId}</Descriptions.Item>
            <Descriptions.Item label="Reported fault">{r.reportedFault}</Descriptions.Item>
            <Descriptions.Item label="Diagnosis">{r.diagnosis ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Resolution notes">
              {r.resolutionNotes ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Technician">
              {r.technicianUserId ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Vendor">{r.vendor ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Estimated cost">
              {money(r.estimatedCost, r.costCurrency)}
            </Descriptions.Item>
            <Descriptions.Item label="Actual cost">
              {money(r.actualCost, r.costCurrency)}
            </Descriptions.Item>
            <Descriptions.Item label="Reported at">
              {new Date(r.reportedAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Completed at">
              {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Update assignment" extra={terminal ? <Tag>Terminal</Tag> : null}>
          <Form
            layout="vertical"
            disabled={terminal || update.isPending}
            initialValues={{
              technicianUserId: r.technicianUserId ?? '',
              vendor: r.vendor ?? '',
              estimatedCost: r.estimatedCost ?? '',
            }}
            onFinish={submitAssignmentUpdate}
          >
            <Form.Item name="technicianUserId" label="Technician user ID">
              <Input placeholder="UUID" />
            </Form.Item>
            <Form.Item name="vendor" label="Vendor">
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="estimatedCost" label="Estimated cost">
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={update.isPending} disabled={terminal}>
              Save
            </Button>
          </Form>
        </Card>
      </div>

      <Card title="Status history" style={{ marginTop: 16 }}>
        {r.history && r.history.length > 0 ? (
          <Timeline
            items={r.history.map((h) => ({
              children: (
                <>
                  <Tag color={STATUS_COLOR[h.toStatus]}>{h.toStatus}</Tag>
                  {h.fromStatus && <Typography.Text type="secondary"> ← {h.fromStatus}</Typography.Text>}
                  {h.note && <div>{h.note}</div>}
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
          <Typography.Text type="secondary">No history yet.</Typography.Text>
        )}
      </Card>

      <Modal
        title={`Move to ${transitionModal.to}`}
        open={transitionModal.open}
        onCancel={() => {
          setTransitionModal({ open: false, to: null });
          transitionForm.resetFields();
        }}
        onOk={submitTransition}
        okText="Confirm"
        confirmLoading={transition.isPending}
      >
        <Form form={transitionForm} layout="vertical">
          {needsCompletionFields && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Completing a repair requires resolution notes and an actual cost."
            />
          )}
          <Form.Item
            name="resolutionNotes"
            label="Resolution notes"
            rules={
              needsCompletionFields
                ? [{ required: true, message: 'Required to complete a repair' }]
                : []
            }
          >
            <Input.TextArea rows={3} maxLength={4000} />
          </Form.Item>
          <Form.Item
            name="actualCost"
            label={`Actual cost (${transitionModal.to === 'Completed' ? 'required' : 'optional'})`}
            rules={
              needsCompletionFields
                ? [{ required: true, message: 'Required to complete a repair' }]
                : []
            }
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="diagnosis" label="Diagnosis (optional)">
            <Input.TextArea rows={2} maxLength={4000} />
          </Form.Item>
          <Form.Item name="note" label="History note (optional)">
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
