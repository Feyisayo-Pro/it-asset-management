import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Timeline,
  Typography,
  message,
} from 'antd';
import { EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { AuthedImage } from '@/components/AuthedImage';
import { AssetStatusBadge } from '../components/AssetStatusBadge';
import { useAsset, useAssetHistory, useChangeAssetStatus } from '../hooks/useAssets';
import { assetsApi } from '@/api/assets.api';
import { ApiError } from '@/types/api';

/**
 * Mirrors AssetLifecycleStateMachine's transition table
 * (packages/backend/src/modules/asset/domain/value-objects/asset-status.ts).
 * Keep in sync if the backend table changes — Disposed stays terminal
 * except for the Super Admin recovery flow, which is out of scope here.
 */
const ALLOWED_NEXT: Record<string, string[]> = {
  Registration: ['Available', 'Unaccounted'],
  Available: ['Reserved', 'Allocated', 'UnderRepair', 'Disposed', 'Lost', 'Stolen', 'Unaccounted'],
  Reserved: ['Available', 'Allocated'],
  Allocated: ['Returned', 'UnderRepair', 'Lost', 'Stolen'],
  Returned: ['Available', 'UnderRepair', 'Disposed'],
  UnderRepair: ['Available', 'Disposed'],
  Disposed: [],
  Lost: ['Available', 'Unaccounted'],
  Stolen: ['Available', 'Unaccounted'],
  Unaccounted: ['Available', 'Lost', 'Stolen'],
};

export const AssetDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const asset = useAsset(id);
  const history = useAssetHistory(id);
  const changeStatus = useChangeAssetStatus(id);

  const [transitionModal, setTransitionModal] = useState<{ open: boolean; to: string | null }>({
    open: false,
    to: null,
  });
  const [transitionForm] = Form.useForm();
  const [printing, setPrinting] = useState(false);

  if (asset.isLoading || !asset.data)
    return (
      <Card>
        <Skeleton active />
      </Card>
    );

  const a = asset.data;
  const allowedNext = ALLOWED_NEXT[a.status] ?? [];
  const needsHolder = transitionModal.to === 'Allocated';

  const submitTransition = async () => {
    const values = await transitionForm.validateFields();
    try {
      await changeStatus.mutateAsync({
        toStatus: transitionModal.to!,
        reason: values.reason,
        newHolderId: needsHolder ? values.newHolderId : undefined,
      });
      messageApi.success(`Status changed to ${transitionModal.to}`);
      setTransitionModal({ open: false, to: null });
      transitionForm.resetFields();
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Status change failed');
    }
  };

  const printQrTag = async () => {
    setPrinting(true);
    try {
      const blob = await assetsApi.qrBlob(a.id);
      const url = URL.createObjectURL(blob);
      const win = window.open('', '_blank', 'width=420,height=520');
      if (!win) {
        messageApi.error('Pop-up blocked — allow pop-ups for this site to print the QR tag.');
        URL.revokeObjectURL(url);
        return;
      }
      win.document.write(`<!doctype html>
        <html>
          <head>
            <title>QR tag — ${a.assetTag}</title>
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; }
              img { width: 220px; height: 220px; }
              h2 { margin: 12px 0 2px; font-size: 18px; }
              p { margin: 0; color: #555; font-size: 13px; }
            </style>
          </head>
          <body>
            <img src="${url}" alt="QR code" onload="window.print()" />
            <h2>${a.assetTag}</h2>
            <p>${a.brand} ${a.model}</p>
          </body>
        </html>`);
      win.document.close();
    } catch {
      messageApi.error('Failed to generate the QR tag.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div>
      {contextHolder}
      <PageHeader
        title={a.assetTag}
        subtitle={`${a.brand} ${a.model}`}
        actions={
          <>
            <Button icon={<PrinterOutlined />} loading={printing} onClick={printQrTag}>
              Print QR tag
            </Button>
            <Button
              icon={<EditOutlined />}
              type="primary"
              onClick={() => nav(`/assets/${a.id}/edit`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap align="center">
          <Typography.Text type="secondary">Status:</Typography.Text>
          <AssetStatusBadge status={a.status} />
          {allowedNext.length > 0 ? (
            allowedNext.map((s) => (
              <Button
                key={s}
                onClick={() => setTransitionModal({ open: true, to: s })}
                danger={s === 'Disposed' || s === 'Lost' || s === 'Stolen'}
              >
                Move to {s}
              </Button>
            ))
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Disposed is terminal — recovery requires a Super Admin action from the Disposal module."
            />
          )}
        </Space>
      </Card>

      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title="Details">
          <Descriptions column={{ xs: 1, sm: 1, md: 2 }} bordered size="small">
            <Descriptions.Item label="Status">
              <AssetStatusBadge status={a.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Device type">{a.deviceType}</Descriptions.Item>
            <Descriptions.Item label="Serial number">{a.serialNumber}</Descriptions.Item>
            <Descriptions.Item label="IMEI">{a.imei ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Vendor">{a.vendor ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Purchase">
              {a.purchaseAmount != null
                ? `${a.purchaseCurrency} ${a.purchaseAmount.toFixed(2)}`
                : '—'}
              {a.purchaseDate ? ` · ${a.purchaseDate}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="Warranty">{a.warrantyExpiry ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Office">{a.officeLocation ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Department">{a.department ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Assigned to">
              {a.assignedEmployeeName ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Current holder">
              {a.currentHolderId ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes" span={2}>
              {a.notes || '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Barcodes">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Typography.Text type="secondary">QR code</Typography.Text>
              <div>
                <AuthedImage
                  alt="QR"
                  fetcher={() => assetsApi.qrBlob(a.id)}
                  style={{ maxWidth: '100%', border: '1px solid #eee', padding: 8 }}
                />
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Barcode</Typography.Text>
              <div>
                <AuthedImage
                  alt="Barcode"
                  fetcher={() => assetsApi.barcodeBlob(a.id)}
                  style={{ maxWidth: '100%', border: '1px solid #eee', padding: 8 }}
                />
              </div>
            </div>
          </Space>
        </Card>
      </div>

      <Card title="Status history" style={{ marginTop: 16 }}>
        {history.isLoading ? (
          <Skeleton active />
        ) : (history.data ?? []).length === 0 ? (
          <Typography.Text type="secondary">No history yet.</Typography.Text>
        ) : (
          <Timeline
            items={(history.data ?? []).map((h) => ({
              children: (
                <>
                  <strong>{h.toStatus}</strong>
                  {h.fromStatus ? ` (from ${h.fromStatus})` : ''}
                  {h.reason ? ` — ${h.reason}` : ''}
                  <div>
                    <Typography.Text type="secondary">
                      {new Date(h.occurredAt).toLocaleString()}
                    </Typography.Text>
                  </div>
                </>
              ),
            }))}
          />
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
        okButtonProps={{ danger: transitionModal.to === 'Disposed' }}
        confirmLoading={changeStatus.isPending}
        destroyOnClose
      >
        <Form form={transitionForm} layout="vertical">
          {transitionModal.to === 'Disposed' && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Disposed is a terminal state — this asset becomes read-only afterward."
            />
          )}
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'A reason is required for every status change' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          {needsHolder && (
            <Form.Item
              name="newHolderId"
              label="New holder (user ID)"
              rules={[{ required: true, message: 'Required when allocating an asset' }]}
            >
              <Input placeholder="UUID" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};
