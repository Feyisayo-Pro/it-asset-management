import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Skeleton,
  Space,
  Timeline,
  Typography,
} from 'antd';
import { EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { AssetStatusBadge } from '../components/AssetStatusBadge';
import { useAsset, useAssetHistory } from '../hooks/useAssets';
import { assetsApi } from '@/api/assets.api';

export const AssetDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const asset = useAsset(id);
  const history = useAssetHistory(id);

  if (asset.isLoading || !asset.data)
    return (
      <Card>
        <Skeleton active />
      </Card>
    );

  const a = asset.data;

  return (
    <div>
      <PageHeader
        title={a.assetTag}
        subtitle={`${a.brand} ${a.model}`}
        actions={
          <>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => window.open(assetsApi.qrUrl(a.id), '_blank')}
            >
              QR code
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title="Details">
          <Descriptions column={2} bordered size="small">
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
                <img
                  alt="QR"
                  src={assetsApi.qrUrl(a.id)}
                  style={{ maxWidth: '100%', border: '1px solid #eee', padding: 8 }}
                />
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Barcode</Typography.Text>
              <div>
                <img
                  alt="Barcode"
                  src={assetsApi.barcodeUrl(a.id)}
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
    </div>
  );
};
