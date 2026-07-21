import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Descriptions, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { useVendor } from '../hooks/useVendors';

export const VendorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: vendor, isLoading } = useVendor(id);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!vendor) return <Typography.Text>Vendor not found</Typography.Text>;

  return (
    <div>
      <PageHeader
        title={vendor.name}
        subtitle="Vendor details"
        actions={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/vendors')}>Back</Button>
            <Button icon={<EditOutlined />} onClick={() => nav(`/vendors/${id}/edit`)}>Edit</Button>
          </Space>
        }
      />
      <Card>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Name">{vendor.name}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={vendor.isActive ? 'green' : 'default'}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Contact Person">{vendor.contactPerson ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{vendor.email ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{vendor.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Tax ID">{vendor.taxId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Website">{vendor.website ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{vendor.address ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>{vendor.notes ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
