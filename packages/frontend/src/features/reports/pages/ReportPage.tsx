import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Typography,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { ExportFormat, ReportFilters, REPORT_TYPES, ReportType } from '@/api/reports.api';
import { downloadExport, useReport } from '../hooks/useReports';
import { SimpleBarChart } from '../components/SimpleBarChart';

const REPORT_LABELS: Record<string, string> = {
  inventory: 'Inventory Report',
  allocation: 'Allocation Report',
  returns: 'Returns Report',
  repairs: 'Repairs Report',
  disposals: 'Disposals Report',
  'department-summary': 'Department Summary',
  compliance: 'Compliance Report',
  'sla-performance': 'SLA Performance',
};

export const ReportPage = () => {
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [exporting, setExporting] = useState(false);

  const query = useReport(reportType, filters);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      await downloadExport(reportType, format, filters);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="Reports"
        subtitle="Generate and export reports"
        actions={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('csv')}
              loading={exporting}
            >
              CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('excel')}
              loading={exporting}
            >
              Excel
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('pdf')}
              loading={exporting}
            >
              PDF
            </Button>
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Space className="list-filters" wrap>
          <Select
            value={reportType}
            style={{ width: 220 }}
            onChange={(v) => setReportType(v)}
            options={REPORT_TYPES.filter(
              (t) => t !== 'dashboard' && t !== 'employee-asset-history',
            ).map((t) => ({
              value: t,
              label: REPORT_LABELS[t] ?? t,
            }))}
          />
          <DatePicker.RangePicker
            onChange={(dates) => {
              setFilters({
                ...filters,
                dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
                dateTo: dates?.[1]?.format('YYYY-MM-DD'),
              });
            }}
          />
          <Input
            placeholder="Department"
            style={{ width: 160 }}
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
            allowClear
          />
          <Input
            placeholder="Asset type"
            style={{ width: 160 }}
            value={filters.assetType}
            onChange={(e) => setFilters({ ...filters, assetType: e.target.value || undefined })}
            allowClear
          />
          <Input
            placeholder="Brand"
            style={{ width: 140 }}
            value={filters.brand}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value || undefined })}
            allowClear
          />
          <Input
            placeholder="Status"
            style={{ width: 140 }}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            allowClear
          />
        </Space>
      </Card>

      {query.isLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : query.data ? (
        <ReportDisplay data={query.data} reportType={reportType} />
      ) : null}
    </div>
  );
};

const ReportDisplay = ({
  data,
  reportType,
}: {
  data: Record<string, unknown>;
  reportType: string;
}) => {
  const arrayKeys = Object.keys(data).filter(
    (k) => Array.isArray(data[k]) && (data[k] as unknown[]).length > 0,
  );
  const scalarKeys = Object.keys(data).filter(
    (k) =>
      !Array.isArray(data[k]) &&
      typeof data[k] !== 'object' &&
      k !== 'reportType' &&
      k !== 'generatedAt',
  );
  const objectKeys = Object.keys(data).filter(
    (k) =>
      typeof data[k] === 'object' &&
      !Array.isArray(data[k]) &&
      data[k] !== null &&
      k !== 'reportType' &&
      k !== 'generatedAt',
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Generated: {data.generatedAt as string}
      </Typography.Text>

      {scalarKeys.length > 0 && (
        <Card title="Summary" size="small">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            {scalarKeys.map((k) => (
              <Descriptions.Item key={k} label={formatLabel(k)}>
                {formatValue(data[k])}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {objectKeys.map((k) => (
          <Col key={k} xs={24} md={12}>
            <Card title={formatLabel(k)} size="small">
              <Descriptions bordered size="small" column={1}>
                {Object.entries(data[k] as Record<string, unknown>).map(
                  ([subKey, val]) => (
                    <Descriptions.Item key={subKey} label={formatLabel(subKey)}>
                      {formatValue(val)}
                    </Descriptions.Item>
                  ),
                )}
              </Descriptions>
            </Card>
          </Col>
        ))}

        {arrayKeys.map((k) => {
          const arr = data[k] as Record<string, unknown>[];
          const isChartable = arr.length > 0 && (
            ('month' in arr[0] && 'count' in arr[0]) ||
            ('status' in arr[0] && 'count' in arr[0])
          );

          return (
            <Col key={k} xs={24} md={12}>
              <Card title={formatLabel(k)} size="small">
                {isChartable && (
                  <div style={{ marginBottom: 16 }}>
                    <SimpleBarChart
                      data={arr.map((r) => ({
                        label: String(
                          r.month ?? r.status ?? r.reason ?? r.assetType ?? r.department ?? r.brand ?? '',
                        ),
                        value: Number(r.count ?? r.total ?? 0),
                      }))}
                      color={reportType === 'repairs' ? '#fa8c16' : '#1A4FD1'}
                    />
                  </div>
                )}
                <Table
                  dataSource={arr}
                  rowKey={(_, i) => String(i)}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={arr.length > 10 ? { pageSize: 10 } : false}
                  columns={Object.keys(arr[0]).map((col) => ({
                    title: formatLabel(col),
                    dataIndex: col,
                    key: col,
                    render: (v: unknown) => formatValue(v),
                  }))}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </Space>
  );
};

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (String(val).includes('.')) return val.toFixed(1);
    return val.toLocaleString();
  }
  return String(val);
}
