import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { AssetForm } from '../components/AssetForm';
import { useCreateAsset } from '../hooks/useAssets';
import { ApiError } from '@/types/api';

export const AssetCreatePage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const create = useCreateAsset();
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div>
      {contextHolder}
      <PageHeader title="Register asset" subtitle="Add a device to inventory" />
      <Card style={{ maxWidth: 900 }}>
        {banner && <Alert type="error" showIcon message={banner} style={{ marginBottom: 16 }} />}
        <AssetForm
          mode="create"
          submitting={create.isPending}
          onCancel={() => nav('/assets')}
          onSubmit={async (values) => {
            setBanner(null);
            try {
              const asset = await create.mutateAsync({
                assetTag: values.assetTag || undefined,
                deviceType: values.deviceType,
                brand: values.brand,
                model: values.model,
                serialNumber: values.serialNumber,
                imei: values.imei || null,
                purchaseDate: values.purchaseDate || null,
                purchaseAmount:
                  values.purchaseAmount === undefined ? null : values.purchaseAmount,
                purchaseCurrency: values.purchaseCurrency || 'USD',
                vendor: values.vendor || null,
                warrantyExpiry: values.warrantyExpiry || null,
                officeLocation: values.officeLocation || null,
                department: values.department || null,
                assignedEmployeeName: values.assignedEmployeeName || null,
                notes: values.notes || null,
                markAvailableImmediately: values.markAvailableImmediately ?? false,
              });
              messageApi.success(`Asset ${asset.assetTag} created`);
              nav('/assets');
            } catch (err) {
              const apiErr = err as ApiError;
              if (apiErr.code === 'DUPLICATE_ASSET_TAG')
                setBanner('Asset tag already in use. Choose another or leave blank to auto-generate.');
              else if (apiErr.code === 'DUPLICATE_SERIAL_NUMBER')
                setBanner('This serial number is already registered.');
              else if (apiErr.code === 'DUPLICATE_IMEI')
                setBanner('This IMEI is already registered.');
              else setBanner(apiErr.message || 'Registration failed');
            }
          }}
        />
      </Card>
    </div>
  );
};
