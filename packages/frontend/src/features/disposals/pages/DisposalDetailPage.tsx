import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { DisposalStatus } from '@/api/disposals.api';
import {
  useApproveDisposal,
  useDisposal,
  useRejectDisposal,
} from '../hooks/useDisposals';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/types/api';

const STATUS_COLOR: Record<DisposalStatus, string> = {
  Requested: 'gold',
  Approved: 'green',
  Rejected: 'volcano',
};

const UrlList = ({ label, items }: { label: string; items: string[] }) =>
  items.length === 0 ? (
    <>
      <Typography.Text type="secondary">No {label.toLowerCase()}.</Typography.Text>
    </>
  ) : (
    <ul style={{ marginLeft: 16 }}>
      {items.map((u) => (
        <li key={u}>
          <a href={u} target="_blank" rel="noreferrer">{u}</a>
        </li>
      ))}
    </ul>
  );

export const DisposalDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const { user, permissions } = useAuth();
  const query = useDisposal(id);
  const approve = useApproveDisposal(id);
  const reject = useRejectDisposal(id);

  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [witnessUserId, setWitnessUserId] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [disposalDate, setDisposalDate] = useState<Dayjs | null>(dayjs());
  const [rejectionReason, setRejectionReason] = useState('');

  if (query.isLoading || !query.data) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }
  const d = query.data;
  const canReview =
    d.status === 'Requested' &&
    (permissions?.includes('disposal:approve') ?? false);
  const isRequester = user?.id === d.requestedByUserId;

  const submitApprove = async () => {
    if (!signature.trim() || !disposalDate) return;
    try {
      await approve.mutateAsync({
        signaturePrintedName: signature.trim(),
        disposalDate: disposalDate.format('YYYY-MM-DD'),
        witnessUserId: witnessUserId.trim() || undefined,
        approvalNotes: approvalNotes.trim() || undefined,
      });
      messageApi.success('Disposal approved — asset is now Disposed.');
      setApproveModal(false);
      setSignature('');
      setWitnessUserId('');
      setApprovalNotes('');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'DISPOSAL_REQUESTER_CANNOT_APPROVE') {
        messageApi.error('You cannot approve your own disposal request.');
      } else {
        messageApi.error(apiErr.message || 'Approval failed');
      }
    }
  };

  const submitReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      await reject.mutateAsync({ rejectionReason: rejectionReason.trim() });
      messageApi.success('Disposal rejected.');
      setRejectModal(false);
      setRejectionReason('');
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Rejection failed');
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={`Disposal ${d.id.slice(0, 8)}…`}
        subtitle={`Asset ${d.assetId.slice(0, 8)}… · ${d.reason} → ${d.method}`}
        actions={
          canReview ? (
            <Space>
              <Button
                type="primary"
                onClick={() => setApproveModal(true)}
                disabled={isRequester}
                title={isRequester ? 'You cannot approve your own request' : undefined}
              >
                Approve
              </Button>
              <Button danger onClick={() => setRejectModal(true)} disabled={isRequester}>
                Reject
              </Button>
            </Space>
          ) : undefined
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Tag color={STATUS_COLOR[d.status]} style={{ fontSize: 14, padding: '4px 10px' }}>
            {d.status}
          </Tag>
          {d.status === 'Approved' && (
            <Alert
              type="success"
              showIcon
              message="Approved — asset flipped to Disposed. It can no longer be edited or allocated."
            />
          )}
          {d.status === 'Rejected' && (
            <Alert
              type="warning"
              showIcon
              message="Request rejected. The asset remains in its previous status."
            />
          )}
          {canReview && isRequester && (
            <Alert
              type="info"
              showIcon
              message="You submitted this request, so a different Super Admin must review it (segregation of duties)."
            />
          )}
        </Space>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Request">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Asset">{d.assetId}</Descriptions.Item>
            <Descriptions.Item label="Reason">{d.reason}</Descriptions.Item>
            <Descriptions.Item label="Method">{d.method}</Descriptions.Item>
            <Descriptions.Item label="Requested by">{d.requestedByUserId}</Descriptions.Item>
            <Descriptions.Item label="Requested at">
              {new Date(d.requestedAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Notes">{d.requestNotes ?? '—'}</Descriptions.Item>
          </Descriptions>
          <div style={{ marginTop: 12 }}>
            <Typography.Text strong>Evidence</Typography.Text>
            <UrlList label="Evidence" items={d.evidenceUrls} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Typography.Text strong>Photos</Typography.Text>
            <UrlList label="Photos" items={d.photoUrls} />
          </div>
        </Card>

        <Card title="Resolution">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLOR[d.status]}>{d.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Approved by">
              {d.approvedByUserId ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Approved at">
              {d.approvedAt ? new Date(d.approvedAt).toLocaleString() : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Disposal date">
              {d.disposalDate ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Witness">{d.witnessUserId ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Signature">
              {d.signatureName ? `${d.signatureName} (${d.signatureIp ?? 'ip n/a'})` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Approval notes">
              {d.approvalNotes ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Rejection reason">
              {d.rejectionReason ?? '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Modal
        title="Approve disposal"
        open={approveModal}
        onCancel={() => setApproveModal(false)}
        onOk={submitApprove}
        okText="Approve & sign"
        confirmLoading={approve.isPending}
        okButtonProps={{ disabled: !signature.trim() || !disposalDate }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="warning"
            showIcon
            message="Approving is irreversible. The asset will be marked Disposed and can no longer be edited or allocated."
          />
          <Form layout="vertical">
            <Form.Item label="Printed name (signature)" required>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Full legal name"
                maxLength={255}
              />
            </Form.Item>
            <Form.Item label="Disposal date" required>
              <DatePicker
                value={disposalDate}
                onChange={setDisposalDate}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Witness user ID (optional)">
              <Input
                value={witnessUserId}
                onChange={(e) => setWitnessUserId(e.target.value)}
                placeholder="UUID"
              />
            </Form.Item>
            <Form.Item label="Approval notes (optional)">
              <Input.TextArea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                maxLength={4000}
              />
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      <Modal
        title="Reject disposal"
        open={rejectModal}
        onCancel={() => setRejectModal(false)}
        onOk={submitReject}
        okText="Reject request"
        okButtonProps={{ danger: true, disabled: !rejectionReason.trim() }}
        confirmLoading={reject.isPending}
      >
        <Input.TextArea
          rows={4}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Reason for rejection (required)"
          maxLength={4000}
        />
      </Modal>
    </div>
  );
};
