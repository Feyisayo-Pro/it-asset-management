import { Module } from '@nestjs/common';
import { ReportingService } from './application/reporting.service';
import { CsvExportService } from './application/export/csv-export.service';
import { ExcelExportService } from './application/export/excel-export.service';
import { PdfExportService } from './application/export/pdf-export.service';
import { ReportingController } from './presentation/reporting.controller';

@Module({
  controllers: [ReportingController],
  providers: [
    ReportingService,
    CsvExportService,
    ExcelExportService,
    PdfExportService,
  ],
})
export class ReportingModule {}
