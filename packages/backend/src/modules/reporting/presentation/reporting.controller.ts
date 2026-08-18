import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { ReportingService } from '../application/reporting.service';
import { CsvExportService } from '../application/export/csv-export.service';
import { ExcelExportService } from '../application/export/excel-export.service';
import { PdfExportService } from '../application/export/pdf-export.service';
import { ExportQuery, ReportFiltersQuery, ReportType } from './dto/report.dtos';

@Controller('reports')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly csvExport: CsvExportService,
    private readonly excelExport: ExcelExportService,
    private readonly pdfExport: PdfExportService,
  ) {}

  @Get('inventory')
  @RequirePermissions('report:read')
  inventory(@Query() q: ReportFiltersQuery) {
    return this.reportingService.inventoryReport(q);
  }

  @Get('allocation')
  @RequirePermissions('report:read')
  allocation(@Query() q: ReportFiltersQuery) {
    return this.reportingService.allocationReport(q);
  }

  @Get('returns')
  @RequirePermissions('report:read')
  returns(@Query() q: ReportFiltersQuery) {
    return this.reportingService.returnsReport(q);
  }

  @Get('repairs')
  @RequirePermissions('report:read')
  repairs(@Query() q: ReportFiltersQuery) {
    return this.reportingService.repairsReport(q);
  }

  @Get('disposals')
  @RequirePermissions('report:read')
  disposals(@Query() q: ReportFiltersQuery) {
    return this.reportingService.disposalsReport(q);
  }

  @Get('employee-asset-history/:userId')
  @RequirePermissions('report:read')
  employeeHistory(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reportingService.employeeAssetHistory(userId);
  }

  @Get('department-summary')
  @RequirePermissions('report:read')
  departmentSummary() {
    return this.reportingService.departmentSummary();
  }

  @Get('compliance')
  @RequirePermissions('report:read')
  compliance() {
    return this.reportingService.complianceReport();
  }

  @Get('sla-performance')
  @RequirePermissions('report:read')
  slaPerformance(@Query() q: ReportFiltersQuery) {
    return this.reportingService.slaPerformance(q);
  }

  @Get('dashboard')
  @RequirePermissions('report:read')
  dashboard() {
    return this.reportingService.dashboardAnalytics();
  }

  @Get('export')
  @RequirePermissions('report:export')
  async export(@Query() q: ExportQuery, @Res() res: Response) {
    const reportData = await this.getReportData(q.reportType, q);
    const flatData = this.flattenReportData(reportData);

    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (q.format) {
      case 'csv':
        buffer = this.csvExport.generate(flatData);
        contentType = 'text/csv';
        extension = 'csv';
        break;
      case 'excel':
        buffer = this.excelExport.generate(flatData, q.reportType);
        contentType = 'application/vnd.ms-excel';
        extension = 'xls';
        break;
      case 'pdf':
        buffer = this.pdfExport.generate(flatData, q.reportType);
        contentType = 'application/pdf';
        extension = 'pdf';
        break;
    }

    const filename = `${q.reportType}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  private async getReportData(
    reportType: ReportType,
    filters: ReportFiltersQuery,
  ): Promise<Record<string, unknown>> {
    switch (reportType) {
      case 'inventory':
        return this.reportingService.inventoryReport(filters);
      case 'allocation':
        return this.reportingService.allocationReport(filters);
      case 'returns':
        return this.reportingService.returnsReport(filters);
      case 'repairs':
        return this.reportingService.repairsReport(filters);
      case 'disposals':
        return this.reportingService.disposalsReport(filters);
      case 'department-summary':
        return this.reportingService.departmentSummary();
      case 'compliance':
        return this.reportingService.complianceReport();
      case 'sla-performance':
        return this.reportingService.slaPerformance(filters);
      case 'dashboard':
        return this.reportingService.dashboardAnalytics();
      default:
        return { error: 'Unsupported report type for export' };
    }
  }

  private flattenReportData(
    report: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const arrayKeys = Object.keys(report).filter(
      (k) => Array.isArray(report[k]) && (report[k] as unknown[]).length > 0,
    );
    if (arrayKeys.length > 0) {
      const key = arrayKeys[0];
      return report[key] as Record<string, unknown>[];
    }
    const { reportType, generatedAt, ...rest } = report;
    return [rest as Record<string, unknown>];
  }
}
