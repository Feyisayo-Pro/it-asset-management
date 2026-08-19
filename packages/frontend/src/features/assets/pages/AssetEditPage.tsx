import { useNavigate, useParams } from 'react-router-dom';
import { Card, Skeleton, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { AssetForm } from '../components/AssetForm';
import { useAsset, useUpdateAsset } from '../hooks/useAssets';
import { ApiError } from '@/types/api';

export const AssetEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const query = useAsset(id);
  const update = useUpdateAsset(id);

  return (
    <div>
      {contextHolder}
      <PageHeader title="Edit asset" subtitle={query.data?.assetTag ?? ''} />
      <Card style={{ maxWidth: 900 }}>
        {query.isLoading || !query.data ? (
          <Skeleton active />
        ) : (
          <AssetForm
            mode="edit"
            initialValues={{
              assetTag: query.data.assetTag,
              deviceType: query.data.deviceType,
              brand: query.data.brand,
              model: query.data.model,
              serialNumber: query.data.serialNumber,
              imei: query.data.imei ?? undefined,
              purchaseDate: query.data.purchaseDate ?? undefined,
              purchaseAmount: query.data.purchaseAmount ?? undefined,
              purchaseCurrency: query.data.purchaseCurrency,
              vendor: query.data.vendor ?? undefined,
              warrantyExpiry: query.data.warrantyExpiry ?? undefined,
              officeLocation: query.data.officeLocation ?? undefined,
              department: query.data.department ?? undefined,
              assignedEmployeeName: query.data.assignedEmployeeName ?? undefined,
              notes: query.data.notes ?? undefined,
            }}
            submitting={update.isPending}
            onCancel={() => nav('/assets')}
            onSubmit={async (values) => {
              try {
                await update.mutateAsync({
                  deviceType: values.deviceType,
                  brand: values.brand,
                  model: values.model,
                  imei: values.imei || null,
                  purchaseDate: values.purchaseDate || null,
                  purchaseAmount:
                    values.purchaseAmount === undefined ? null : values.purchaseAmount,
                  purchaseCurrency: values.purchaseCurrency || undefined,
                  vendor: values.vendor || null,
                  warrantyExpiry: values.warrantyExpiry || null,
                  officeLocation: values.officeLocation || null,
                  department: values.department || null,
                  assignedEmployeeName: values.assignedEmployeeName || null,
                  notes: values.notes || null,
                });
                messageApi.success('Asset updated');
                nav('/assets');
              } catch (err) {
                messageApi.error((err as ApiError).message || 'Update failed');
              }
            }}
          />
        )}
      </Card>
    </div>
  );
};
