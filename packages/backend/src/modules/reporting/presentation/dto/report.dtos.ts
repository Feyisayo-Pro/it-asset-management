import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export const ReportType = {
  Inventory: 'inventory',
  Allocation: 'allocation',
  Returns: 'returns',
  Repairs: 'repairs',
  Disposals: 'disposals',
  EmployeeAssetHistory: 'employee-asset-history',
  DepartmentSummary: 'department-summary',
  Compliance: 'compliance',
  SlaPerformance: 'sla-performance',
  Dashboard: 'dashboard',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const ALL_REPORT_TYPES = Object.values(ReportType);

export const ExportFormat = {
  Csv: 'csv',
  Excel: 'excel',
  Pdf: 'pdf',
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export class ReportFiltersQuery {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  assetType?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsUUID()
  employeeUserId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ExportQuery extends ReportFiltersQuery {
  @IsEnum(ALL_REPORT_TYPES)
  reportType!: ReportType;

  @IsEnum(['csv', 'excel', 'pdf'])
  format!: ExportFormat;
}
