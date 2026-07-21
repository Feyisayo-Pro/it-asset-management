import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Descriptions, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { useAcquisition } from '../hooks/useAcquisitions';

const formatCurrency = (cents: number | null, currency: string) => {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
};

export const AcquisitionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: acq, isLoading } = useAcquisition(id);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!acq) return <Typography.Text>Acquisition not found</Typography.Text>;

  return (
    <div>
      <PageHeader
        title={acq.invoiceNumber || 'Acquisition'}
        subtitle="Procurement details"
        actions={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/acquisitions')}>Back</Button>
            <Button icon={<EditOutlined />} onClick={() => nav(`/acquisitions/${id}/edit`)}>Edit</Button>
          </Space>
        }
      />
      <Card>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Invoice #">{acq.invoiceNumber ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{acq.vendorName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Purchase Date">{acq.purchaseDate ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Warranty">
            {acq.warrantyMonths != null ? <Tag>{acq.warrantyMonths} months</Tag> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Unit Cost">
            {formatCurrency(acq.unitCostCents, acq.currency)}
          </Descriptions.Item>
          <Descriptions.Item label="Quantity">{acq.quantity}</Descriptions.Item>
          <Descriptions.Item label="Total Cost">
            {acq.unitCostCents != null
              ? formatCurrency(acq.unitCostCents * acq.quantity, acq.currency)
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Linked Assets">{acq.assetIds.length}</Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>{acq.notes ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
