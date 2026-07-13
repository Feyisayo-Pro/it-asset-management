import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Form, Input, InputNumber, Space } from 'antd';
import { AssetFormValues, assetFormSchema } from '../schemas/asset.schema';

interface Props {
  mode: 'create' | 'edit';
  initialValues?: Partial<AssetFormValues>;
  submitting?: boolean;
  onSubmit: (values: AssetFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export const AssetForm = ({ mode, initialValues, submitting, onSubmit, onCancel }: Props) => {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: initialValues ?? {
      deviceType: '',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseCurrency: 'USD',
    },
    mode: 'onBlur',
  });

  const isCreate = mode === 'create';

  return (
    <Form layout="vertical" onFinish={form.handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {isCreate && (
          <Controller
            control={form.control}
            name="assetTag"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Asset tag (leave blank to auto-generate)"
                validateStatus={fieldState.error ? 'error' : ''}
                help={fieldState.error?.message}
              >
                <Input {...field} maxLength={64} placeholder="AST-2026-00042" />
              </Form.Item>
            )}
          />
        )}
        <Controller
          control={form.control}
          name="serialNumber"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Serial number"
              required
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={128} disabled={!isCreate} />
            </Form.Item>
          )}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Controller
          control={form.control}
          name="deviceType"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Device type"
              required
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={64} placeholder="Laptop" />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="brand"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Brand"
              required
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={128} />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="model"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Model"
              required
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={128} />
            </Form.Item>
          )}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Controller
          control={form.control}
          name="imei"
          render={({ field, fieldState }) => (
            <Form.Item label="IMEI" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input {...field} maxLength={32} />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="purchaseDate"
          render={({ field }) => (
            <Form.Item label="Purchase date">
              <Input {...field} type="date" />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="warrantyExpiry"
          render={({ field }) => (
            <Form.Item label="Warranty expiry">
              <Input {...field} type="date" />
            </Form.Item>
          )}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Controller
          control={form.control}
          name="purchaseAmount"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Purchase amount"
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <InputNumber
                value={field.value as number | undefined}
                onChange={(v) => field.onChange(v ?? undefined)}
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="purchaseCurrency"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Currency"
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={3} placeholder="USD" />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="vendor"
          render={({ field }) => (
            <Form.Item label="Vendor">
              <Input {...field} maxLength={255} />
            </Form.Item>
          )}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Controller
          control={form.control}
          name="officeLocation"
          render={({ field }) => (
            <Form.Item label="Office location">
              <Input {...field} maxLength={128} />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="department"
          render={({ field }) => (
            <Form.Item label="Department">
              <Input {...field} maxLength={128} />
            </Form.Item>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="notes"
        render={({ field }) => (
          <Form.Item label="Notes">
            <Input.TextArea {...field} rows={2} />
          </Form.Item>
        )}
      />

      {isCreate && (
        <Controller
          control={form.control}
          name="markAvailableImmediately"
          render={({ field }) => (
            <Form.Item>
              <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)}>
                Mark available immediately (skip Registration)
              </Checkbox>
            </Form.Item>
          )}
        />
      )}

      <Space>
        <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
          {isCreate ? 'Register asset' : 'Save changes'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </Form>
  );
};
