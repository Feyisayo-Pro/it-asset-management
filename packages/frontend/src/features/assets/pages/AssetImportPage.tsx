import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { useBulkImport } from '../hooks/useAssets';
import { BulkImportResult } from '@/api/assets.api';

const SAMPLE = `asset_tag,device_type,brand,model,serial_number,imei,purchase_date,purchase_amount,purchase_currency,vendor,warranty_expiry,office_location,department,notes
,Laptop,Acme,X1,SN-EXAMPLE,,2026-01-15,1200.00,USD,Acme Direct,2028-01-15,HQ,Engineering,Sample row`;

export const AssetImportPage = () => {
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const importMutation = useBulkImport();

  const run = async (dryRun: boolean) => {
    if (!csv.trim()) {
      messageApi.error('Paste some CSV first');
      return;
    }
    try {
      const r = await importMutation.mutateAsync({ csv, dryRun });
      setResult(r);
      if (!dryRun) {
        messageApi.success(`Imported ${r.successCount} of ${r.totalRows} rows`);
      }
    } catch (err) {
      messageApi.error(
        (err as { message?: string })?.message || 'Bulk import failed',
      );
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setCsv(text);
  };

  const columns: ColumnsType<BulkImportResult['results'][number]> = [
    { title: 'Row', dataIndex: 'row', key: 'row', width: 80 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100 },
    { title: 'Asset tag', dataIndex: 'assetTag', key: 'assetTag' },
    { title: 'Message', dataIndex: 'message', key: 'message' },
  ];

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="Bulk import"
        subtitle="Paste or upload a CSV, dry-run to preview, then commit."
        actions={<Button onClick={() => nav('/assets')}>Back to assets</Button>}
      />

      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="Required columns: device_type, brand, model, serial_number. All others optional."
          />
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button size="small" onClick={() => setCsv(SAMPLE)}>
            Load sample CSV
          </Button>
          <Typography.Text type="secondary">CSV payload</Typography.Text>
          <textarea
            style={{
              width: '100%',
              minHeight: 220,
              fontFamily: 'monospace',
              padding: 8,
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Space>
            <Button loading={importMutation.isPending} onClick={() => run(true)}>
              Dry-run
            </Button>
            <Button
              type="primary"
              loading={importMutation.isPending}
              onClick={() => run(false)}
              disabled={!result || result.errorCount === result.totalRows}
            >
              Commit import
            </Button>
          </Space>
        </Space>
      </Card>

      {result && (
        <Card style={{ marginTop: 16 }} title={`Result (${result.dryRun ? 'dry-run' : 'committed'})`}>
          <Space style={{ marginBottom: 12 }}>
            <Typography.Text>Total: {result.totalRows}</Typography.Text>
            <Typography.Text type="success">Success: {result.successCount}</Typography.Text>
            <Typography.Text type="danger">Errors: {result.errorCount}</Typography.Text>
          </Space>
          <Table
            rowKey="row"
            size="small"
            columns={columns}
            dataSource={result.results}
            pagination={{ pageSize: 20 }}
          />
        </Card>
      )}
    </div>
  );
};
