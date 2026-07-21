import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Spin,
  Steps,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { useAllocation, useTransitionAllocation } from '../hooks/useAllocations';
import { ApiError } from '@/types/api';

const STATE_LABELS: Record<string, string> = {
  Requested: 'Requested',
  PcReview: 'P&C Review',
  StoresSelect: 'Stores Selection',
  ItAssessment: 'IT Assessment',
  EmployeeSignature: 'Employee Signature',
  PcSignature: 'P&C Signature',
  ItSignature: 'IT Signature',
  InventoryUpdate: 'Inventory Update',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
};

const ACTION_LABELS: Record<string, string> = {
  submit: 'Submit for Review',
  'approve-pc': 'Approve (P&C)',
  'reject-pc': 'Reject (P&C)',
  'select-asset': 'Select Asset',
  'approve-it': 'Approve (IT)',
  'reject-it': 'Reject (IT)',
  'sign-employee': 'Sign (Employee)',
  'sign-pc': 'Sign (P&C)',
  'sign-it': 'Sign (IT)',
  'confirm-update': 'Confirm Inventory Update',
  cancel: 'Cancel',
};

export const AllocationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useAllocation(id);
  const transitionMutation = useTransitionAllocation(id ?? '');

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [comment, setComment] = useState('');

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <Typography.Text>Allocation not found</Typography.Text>;

  const { allocation, workflow } = data;

  const handleAction = (actionName: string) => {
    const needsSignature = actionName.startsWith('sign-');
    const needsComment = actionName.startsWith('reject') || actionName === 'cancel';
    if (needsSignature || needsComment) {
      setPendingAction(actionName);
      setSignatureName('');
      setComment('');
      setModalOpen(true);
    } else {
      doTransition(actionName);
    }
  };

  const doTransition = async (actionName: string, sig?: string, cmt?: string) => {
    try {
      await transitionMutation.mutateAsync({
        actionName,
        signatureName: sig,
        comment: cmt,
      });
      messageApi.success('Transition completed');
      setModalOpen(false);
      void refetch();
    } catch (err) {
      messageApi.error((err as ApiError).message || 'Transition failed');
    }
  };

  const mainStages = workflow?.stages
    .filter((s) => !['Completed', 'Rejected', 'Cancelled'].includes(s.state))
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const currentIdx = mainStages.findIndex((s) => s.state === allocation.currentState);
  const isFinal = ['Completed', 'Rejected', 'Cancelled'].includes(allocation.currentState);

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={`Allocation — ${allocation.employeeName ?? 'Unknown'}`}
        subtitle={`Stage: ${STATE_LABELS[allocation.currentState] ?? allocation.currentState}`}
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/allocations')}>Back</Button>
        }
      />

      {workflow && (
        <Card style={{ marginBottom: 16 }}>
          <Steps
            current={isFinal ? mainStages.length : currentIdx}
            status={allocation.currentState === 'Rejected' || allocation.currentState === 'Cancelled' ? 'error' : undefined}
            items={mainStages.map((s) => ({
              title: s.label,
            }))}
            size="small"
          />
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Employee">{allocation.employeeName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Asset">{allocation.assetTag ?? 'Not assigned'}</Descriptions.Item>
          <Descriptions.Item label="Stage">
            <Tag color={isFinal ? (allocation.currentState === 'Completed' ? 'green' : 'red') : 'blue'}>
              {STATE_LABELS[allocation.currentState] ?? allocation.currentState}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Requested">{dayjs(allocation.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Justification" span={2}>
            {allocation.justification ?? '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {workflow && workflow.availableActions.length > 0 && (
        <Card title="Available Actions" style={{ marginBottom: 16 }}>
          <Space wrap>
            {workflow.availableActions.map((a) => (
              <Button
                key={a.actionName}
                type={a.actionName.startsWith('reject') || a.actionName === 'cancel' ? 'default' : 'primary'}
                danger={a.actionName.startsWith('reject') || a.actionName === 'cancel'}
                onClick={() => handleAction(a.actionName)}
                loading={transitionMutation.isPending}
              >
                {ACTION_LABELS[a.actionName] ?? a.actionName}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      {workflow && workflow.history.length > 0 && (
        <Card title="Workflow History">
          <Timeline
            items={workflow.history.map((h) => ({
              children: (
                <div>
                  <Typography.Text strong>
                    {ACTION_LABELS[h.actionName] ?? h.actionName}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    {STATE_LABELS[h.fromState] ?? h.fromState} &rarr; {STATE_LABELS[h.toState] ?? h.toState}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(h.occurredAt).format('YYYY-MM-DD HH:mm')}
                    {h.signatureName && ` — Signed by ${h.signatureName}`}
                  </Typography.Text>
                  {h.comment && (
                    <div style={{ marginTop: 4 }}>
                      <Typography.Text italic>{h.comment}</Typography.Text>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        </Card>
      )}

      <Modal
        title={ACTION_LABELS[pendingAction] ?? pendingAction}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => doTransition(pendingAction, signatureName || undefined, comment || undefined)}
        confirmLoading={transitionMutation.isPending}
      >
        {pendingAction.startsWith('sign-') && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text>Signature Name (your full name):</Typography.Text>
            <Input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter your full name"
              style={{ marginTop: 4 }}
            />
          </div>
        )}
        {(pendingAction.startsWith('reject') || pendingAction === 'cancel') && (
          <div>
            <Typography.Text>Reason / Comment:</Typography.Text>
            <Input.TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide a reason"
              rows={3}
              style={{ marginTop: 4 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
