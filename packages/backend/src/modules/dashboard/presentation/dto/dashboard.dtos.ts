import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DashboardFiltersQuery {
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  office?: string;

  @IsOptional()
  @IsString()
  assetType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export interface DashboardFilters {
  department?: string;
  office?: string;
  assetType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UserContext {
  userId: string;
  roleName: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TrendDataPoint {
  month: string;
  count: number;
}

export interface DashboardKpis {
  totalAssets: number;
  available: number;
  allocated: number;
  underRepair: number;
  returned: number;
  disposed: number;
  lost: number;
  stolen: number;
  pendingRequests: number;
  pendingApprovals: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  occurredAt: string;
}

export interface NotificationWidgetItem {
  id: string;
  eventType: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PendingTaskItem {
  id: string;
  workflowName: string;
  subjectType: string;
  subjectId: string;
  currentState: string;
  createdAt: string;
}

export interface WarrantyExpirationItem {
  id: string;
  assetTag: string;
  brand: string;
  model: string;
  deviceType: string;
  warrantyExpiry: string;
  daysRemaining: number;
}

export interface RepairWidgetItem {
  id: string;
  assetTag: string;
  brand: string;
  model: string;
  status: string;
  reportedFault: string;
  reportedAt: string;
}

export interface RecentAssetItem {
  id: string;
  assetTag: string;
  brand: string;
  model: string;
  deviceType: string;
  status: string;
  createdAt: string;
}

export interface DashboardWidgets {
  recentActivity: ActivityItem[];
  notifications: NotificationWidgetItem[];
  pendingTasks: PendingTaskItem[];
  upcomingWarrantyExpirations: WarrantyExpirationItem[];
  recentRepairs: RepairWidgetItem[];
  recentlyAddedAssets: RecentAssetItem[];
}

export interface DashboardCharts {
  assetsByDepartment: ChartDataPoint[];
  assetsByBrand: ChartDataPoint[];
  assetsByType: ChartDataPoint[];
  allocationTrends: TrendDataPoint[];
  returnTrends: TrendDataPoint[];
  repairTrends: TrendDataPoint[];
  compliancePerformance: ChartDataPoint[];
}

export interface EnterpriseDashboardData {
  kpis: DashboardKpis;
  charts: DashboardCharts;
  widgets: DashboardWidgets;
  filterOptions: {
    departments: string[];
    offices: string[];
    assetTypes: string[];
  };
  role: string;
  generatedAt: string;
}
