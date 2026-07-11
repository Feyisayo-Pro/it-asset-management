import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../rbac/domain/enums/role-name.enum';
import { Permission } from '../../rbac/domain/enums/permission.enum';
import { RegisterAssetUseCase } from '../application/use-cases/register-asset.use-case';
import { UpdateAssetUseCase } from '../application/use-cases/update-asset.use-case';
import { ChangeAssetStatusUseCase } from '../application/use-cases/change-asset-status.use-case';
import { GetAssetUseCase } from '../application/use-cases/get-asset.use-case';
import { ListAssetsUseCase } from '../application/use-cases/list-assets.use-case';
import { DeleteAssetUseCase } from '../application/use-cases/delete-asset.use-case';
import { BulkImportAssetsUseCase } from '../application/use-cases/bulk-import-assets.use-case';
import { ExportAssetsUseCase } from '../application/use-cases/export-assets.use-case';
import { GetAssetHistoryUseCase } from '../application/use-cases/get-asset-history.use-case';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ChangeAssetStatusDto } from './dto/change-status.dto';
import { ListAssetsQuery } from './dto/list-assets.query';
import { BulkImportDto } from './dto/bulk-import.dto';
import { toAssetDto, toStatusHistoryDto } from './dto/asset.mapper';
import { BARCODE_SERVICE, BarcodeService } from '../application/ports/barcode.port';

@Controller('assets')
@Roles(
  RoleName.SUPER_ADMIN,
  RoleName.STORES_OFFICER,
  RoleName.IT_REP,
  RoleName.PEOPLE_CULTURE,
  RoleName.EMPLOYEE,
)
export class AssetController {
  constructor(
    private readonly registerAsset: RegisterAssetUseCase,
    private readonly updateAsset: UpdateAssetUseCase,
    private readonly changeStatus: ChangeAssetStatusUseCase,
    private readonly getAsset: GetAssetUseCase,
    private readonly listAssets: ListAssetsUseCase,
    private readonly deleteAsset: DeleteAssetUseCase,
    private readonly bulkImport: BulkImportAssetsUseCase,
    private readonly exportAssets: ExportAssetsUseCase,
    private readonly getHistory: GetAssetHistoryUseCase,
    @Inject(BARCODE_SERVICE) private readonly barcodes: BarcodeService,
  ) {}

  @Get()
  async list(
    @Query() q: ListAssetsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Row-level scoping: users without asset:read (Employees, who hold
    // asset:read-own) only ever see assets currently assigned to them.
    const canReadAll = user.permissions.includes(Permission.AssetRead);
    const result = await this.listAssets.execute({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      status: q.status,
      deviceType: q.deviceType,
      brand: q.brand,
      department: q.department,
      currentHolderId: canReadAll ? q.currentHolderId : user.id,
      sort: q.sortField
        ? { field: q.sortField, direction: q.sortDirection ?? 'asc' }
        : undefined,
    });
    return {
      data: result.data.map(toAssetDto),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get('export')
  @RequirePermissions(Permission.AssetRead)
  async export(@Query() q: ListAssetsQuery, @Res() res: Response) {
    const csv = await this.exportAssets.toCsv({
      search: q.search,
      status: q.status,
      deviceType: q.deviceType,
      brand: q.brand,
      department: q.department,
      currentHolderId: q.currentHolderId,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="assets-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Get('tag/:tag')
  @RequirePermissions(Permission.AssetRead)
  async byTag(@Param('tag') tag: string) {
    const asset = await this.getAsset.byTag(tag);
    return toAssetDto(asset);
  }

  @Get(':id')
  @RequirePermissions(Permission.AssetRead)
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const asset = await this.getAsset.byId(id);
    return toAssetDto(asset);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.AssetRead)
  async history(@Param('id', ParseUUIDPipe) id: string) {
    const entries = await this.getHistory.execute(id);
    return entries.map(toStatusHistoryDto);
  }

  @Get(':id/qr')
  @RequirePermissions(Permission.AssetRead)
  async qr(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const asset = await this.getAsset.byId(id);
    const buf = await this.barcodes.qrPngBuffer(asset.assetTag);
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  }

  @Get(':id/barcode')
  @RequirePermissions(Permission.AssetRead)
  async barcode(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const asset = await this.getAsset.byId(id);
    const buf = await this.barcodes.barcodePngBuffer(asset.assetTag);
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.AssetManage)
  async create(@Body() dto: CreateAssetDto) {
    const asset = await this.registerAsset.execute(dto);
    return toAssetDto(asset);
  }

  @Patch(':id')
  @RequirePermissions(Permission.AssetManage)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    const asset = await this.updateAsset.execute({ assetId: id, ...dto });
    return toAssetDto(asset);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.AssetDirectStatus)
  async changeStatusAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeAssetStatusDto,
  ) {
    const asset = await this.changeStatus.execute({
      assetId: id,
      toStatus: dto.toStatus,
      reason: dto.reason,
      newHolderId: dto.newHolderId ?? undefined,
    });
    return toAssetDto(asset);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.AssetManage)
  async deleteAction(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteAsset.execute({ assetId: id });
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AssetManage)
  async import(@Body() dto: BulkImportDto) {
    return this.bulkImport.execute({
      csv: dto.csv,
      dryRun: dto.dryRun ?? false,
    });
  }
}
