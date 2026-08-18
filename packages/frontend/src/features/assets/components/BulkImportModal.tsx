import { useState } from 'react';
import { Alert, Button, Modal, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useBulkImport } from '../hooks/useAssets';
import { BulkImportResult } from '@/api/assets.api';
import { ApiError } from '@/types/api';

const SAMPLE = `asset_tag,device_type,brand,model,serial_number,imei,purchase_date,purchase_amount,purchase_currency,vendor,warranty_expiry,office_location,department,notes
,Laptop,Acme,X1,SN-EXAMPLE,,2026-01-15,1200.00,USD,Acme Direct,2028-01-15,HQ,Engineering,Sample row`;

interface Props {
  open: boolean;
  onClose: () => void;
}

export const BulkImportModal = ({ open, onClose }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [hasDryRun, setHasDryRun] = useState(false);
  const importMutation = useBulkImport();

  const reset = () => {
    setCsv('');
    setResult(null);
    setHasDryRun(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const setCsvText = (text: string) => {
    setCsv(text);
    // Any edit invalidates the last dry-run — force a fresh preview
    // before commit is allowed again.
    setHasDryRun(false);
    setResult(null);
  };

  const run = async (dryRun: boolean) => {
    if (!csv.trim()) {
      messageApi.error('Paste some CSV first');
      return;
    }
    try {
      const r = await importMutation.mutateAsync({ csv, dryRun });
      setResult(r);
      if (dryRun) {
        setHasDryRun(true);
      } else {
        messageApi.success(`Imported ${r.successCount} of ${r.totalRows} rows`);
        handleClose();
      }
    } catch (err) {
      const apiErr = err as ApiError;
      messageApi.error(apiErr.message || 'Bulk import failed');
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const columns: ColumnsType<BulkImportResult['results'][number]> = [
    { title: 'Row', dataIndex: 'row', key: 'row', width: 70 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: 'ok' | 'error') => (
        <Tag color={v === 'ok' ? 'green' : 'red'}>{v.toUpperCase()}</Tag>
      ),
    },
    { title: 'Asset tag', dataIndex: 'assetTag', key: 'assetTag', width: 160 },
    { title: 'Message', dataIndex: 'message', key: 'message' },
  ];

  const canCommit = hasDryRun && !!result && result.successCount > 0;

  return (
    <Modal
      title="Bulk import assets"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button loading={importMutation.isPending} onClick={() => run(true)}>
            Dry-run
          </Button>
          <Button
            type="primary"
            loading={importMutation.isPending}
            onClick={() => run(false)}
            disabled={!canCommit}
            title={!hasDryRun ? 'Run a dry-run first to preview errors' : undefined}
          >
            Commit import
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info"
          showIcon
          message="Required columns: device_type, brand, model, serial_number. All others optional. Run a dry-run to validate before committing."
        />
        <Space>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button size="small" onClick={() => setCsvText(SAMPLE)}>
            Load sample CSV
          </Button>
        </Space>
        <Typography.Text type="secondary">CSV payload</Typography.Text>
        <textarea
          style={{
            width: '100%',
            minHeight: 160,
            fontFamily: 'monospace',
            padding: 8,
            border: '1px solid #d9d9d9',
            borderRadius: 4,
          }}
          value={csv}
          onChange={(e) => setCsvText(e.target.value)}
        />

        {result && (
          <>
            <Alert
              type={
                result.errorCount === 0
                  ? 'success'
                  : result.successCount === 0
                    ? 'error'
                    : 'warning'
              }
              showIcon
              message={
                result.dryRun
                  ? `Dry-run: ${result.successCount} of ${result.totalRows} rows would import, ${result.errorCount} error(s).`
                  : `Committed ${result.successCount} of ${result.totalRows} rows, ${result.errorCount} error(s).`
              }
              description={
                result.errorCount > 0
                  ? 'Rows with errors are listed below and will be skipped on commit. Fix them in the CSV and re-run the dry-run to update this preview.'
                  : undefined
              }
            />
            <Table
              rowKey="row"
              size="small"
              columns={columns}
              dataSource={result.results}
              pagination={{ pageSize: 10 }}
            />
          </>
        )}
      </Space>
    </Modal>
  );
};
