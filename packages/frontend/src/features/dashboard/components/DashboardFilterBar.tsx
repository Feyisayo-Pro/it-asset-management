import { DatePicker, Select, Space } from 'antd';
import { DashboardFilters, FilterOptions } from '@/api/dashboard.api';

interface Props {
  filters: DashboardFilters;
  filterOptions?: FilterOptions;
  onChange: (filters: DashboardFilters) => void;
}

export const DashboardFilterBar = ({
  filters,
  filterOptions,
  onChange,
}: Props) => {
  return (
    <Space className="list-filters" wrap size={8}>
      <Select
        placeholder="Department"
        value={filters.department}
        onChange={(v) => onChange({ ...filters, department: v || undefined })}
        allowClear
        style={{ width: 170 }}
        options={
          filterOptions?.departments.map((d) => ({ value: d, label: d })) ?? []
        }
      />
      <Select
        placeholder="Office"
        value={filters.office}
        onChange={(v) => onChange({ ...filters, office: v || undefined })}
        allowClear
        style={{ width: 170 }}
        options={
          filterOptions?.offices.map((o) => ({ value: o, label: o })) ?? []
        }
      />
      <Select
        placeholder="Asset Type"
        value={filters.assetType}
        onChange={(v) => onChange({ ...filters, assetType: v || undefined })}
        allowClear
        style={{ width: 170 }}
        options={
          filterOptions?.assetTypes.map((t) => ({ value: t, label: t })) ?? []
        }
      />
      <DatePicker.RangePicker
        onChange={(dates) => {
          onChange({
            ...filters,
            dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
            dateTo: dates?.[1]?.format('YYYY-MM-DD'),
          });
        }}
        style={{ width: 250 }}
      />
    </Space>
  );
};
