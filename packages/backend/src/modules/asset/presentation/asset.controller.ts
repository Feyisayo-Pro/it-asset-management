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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { RootConfig } from '../../../config/configuration';
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
import {
  AssetDto,
  AssetStatusHistoryDto,
  PagedAssetsDto,
  toAssetDto,
  toStatusHistoryDto,
} from './dto/asset.mapper';
import { BARCODE_SERVICE, BarcodeService } from '../application/ports/barcode.port';

const LIST_QUERY_PARAMS = [
  { name: 'page', required: false, type: Number, description: 'Page number (default 1)' },
  { name: 'pageSize', required: false, type: Number, description: 'Rows per page, max 500 (default 20)' },
  { name: 'search', required: false, type: String, description: 'Matches asset tag, serial number, IMEI, brand, model' },
  { name: 'status', required: false, type: String, description: 'Exact asset status' },
  { name: 'deviceType', required: false, type: String },
  { name: 'brand', required: false, type: String },
  { name: 'department', required: false, type: String, description: 'Exact match' },
  { name: 'officeLocation', required: false, type: String, description: 'Exact match' },
  { name: 'currentHolderId', required: false, type: String, description: 'User ID (UUID)' },
] as const;

@ApiTags('assets')
@ApiBearerAuth('access-token')
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
    private readonly config: ConfigService<RootConfig>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List assets',
    description:
      'Paginated, filterable asset listing. Employees (asset:read-own only) are automatically scoped to assets they currently hold.',
  })
  @ApiQuery(LIST_QUERY_PARAMS[0])
  @ApiQuery(LIST_QUERY_PARAMS[1])
  @ApiQuery(LIST_QUERY_PARAMS[2])
  @ApiQuery(LIST_QUERY_PARAMS[3])
  @ApiQuery(LIST_QUERY_PARAMS[4])
  @ApiQuery(LIST_QUERY_PARAMS[5])
  @ApiQuery(LIST_QUERY_PARAMS[6])
  @ApiQuery(LIST_QUERY_PARAMS[7])
  @ApiQuery(LIST_QUERY_PARAMS[8])
  @ApiResponse({ status: 200, description: 'Paginated asset list', type: PagedAssetsDto })
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
      officeLocation: q.officeLocation,
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
  @ApiOperation({
    summary: 'Export assets as CSV',
    description: 'Streams matching assets as a CSV file; accepts the same filters as list.',
  })
  @ApiQuery(LIST_QUERY_PARAMS[2])
  @ApiQuery(LIST_QUERY_PARAMS[3])
  @ApiQuery(LIST_QUERY_PARAMS[4])
  @ApiQuery(LIST_QUERY_PARAMS[5])
  @ApiQuery(LIST_QUERY_PARAMS[6])
  @ApiQuery(LIST_QUERY_PARAMS[7])
  @ApiQuery(LIST_QUERY_PARAMS[8])
  @ApiResponse({ status: 200, description: 'CSV file stream (text/csv)' })
  async export(@Query() q: ListAssetsQuery, @Res() res: Response) {
    const csvStream = await this.exportAssets.streamCsv({
      search: q.search,
      status: q.status,
      deviceType: q.deviceType,
      brand: q.brand,
      department: q.department,
      officeLocation: q.officeLocation,
      currentHolderId: q.currentHolderId,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="assets-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    csvStream.on('error', (err) => res.destroy(err));
    csvStream.pipe(res);
  }

  @Get('tag/:tag')
  @RequirePermissions(Permission.AssetRead)
  @ApiOperation({ summary: 'Get an asset by its asset tag' })
  @ApiParam({ name: 'tag', example: 'AST-2026-00042' })
  @ApiResponse({ status: 200, type: AssetDto })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async byTag(@Param('tag') tag: string) {
    const asset = await this.getAsset.byTag(tag);
    return toAssetDto(asset);
  }

  @Get(':id')
  @RequirePermissions(Permission.AssetRead)
  @ApiOperation({ summary: 'Get an asset by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: AssetDto })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const asset = await this.getAsset.byId(id);
    return toAssetDto(asset);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.AssetRead)
  @ApiOperation({ summary: 'Get an asset\'s status change history' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [AssetStatusHistoryDto] })
  async history(@Param('id', ParseUUIDPipe) id: string) {
    const entries = await this.getHistory.execute(id);
    return entries.map(toStatusHistoryDto);
  }

  @Get(':id/qr')
  @RequirePermissions(Permission.AssetRead)
  @ApiOperation({
    summary: 'Get a QR code (PNG) encoding a link to the asset\'s management page',
    description:
      'The QR payload is a full URL (frontend origin + /assets/tag/{assetTag}), not just the bare tag — scanning it with a phone camera opens the asset directly.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'PNG image (image/png)' })
  async qr(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const asset = await this.getAsset.byId(id);
    const { corsOrigin } = this.config.getOrThrow<RootConfig['app']>('app');
    const url = `${corsOrigin.replace(/\/$/, '')}/assets/tag/${asset.assetTag}`;
    const buf = await this.barcodes.qrPngBuffer(url);
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  }

  @Get(':id/barcode')
  @RequirePermissions(Permission.AssetRead)
  @ApiOperation({ summary: 'Get a 1D barcode (PNG) encoding the asset tag' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'PNG image (image/png)' })
  async barcode(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const asset = await this.getAsset.byId(id);
    const buf = await this.barcodes.barcodePngBuffer(asset.assetTag);
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.AssetManage)
  @ApiOperation({ summary: 'Register a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created', type: AssetDto })
  @ApiResponse({ status: 400, description: 'Validation error (e.g. bad assetTag format, warrantyExpiry before purchaseDate)' })
  @ApiResponse({ status: 409, description: 'Duplicate assetTag, serialNumber, or imei' })
  async create(@Body() dto: CreateAssetDto) {
    const asset = await this.registerAsset.execute(dto);
    return toAssetDto(asset);
  }

  @Patch(':id')
  @RequirePermissions(Permission.AssetManage)
  @ApiOperation({ summary: 'Update asset details (not status or tag/serial)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Asset updated', type: AssetDto })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 409, description: 'Asset is Disposed (immutable), or duplicate imei' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    const asset = await this.updateAsset.execute({ assetId: id, ...dto });
    return toAssetDto(asset);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.AssetDirectStatus)
  @ApiOperation({
    summary: 'Change an asset\'s lifecycle status',
    description: 'Transition must be legal per AssetLifecycleStateMachine; Disposed is terminal.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Status changed', type: AssetDto })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 409, description: 'Illegal status transition' })
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
  @ApiOperation({
    summary: 'Delete an asset',
    description: 'Hard delete, restricted to assets still in Registration status. Dispose assets with history instead.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Asset deleted' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 409, description: 'Asset has left Registration status' })
  async deleteAction(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteAsset.execute({ assetId: id });
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AssetManage)
  @ApiOperation({
    summary: 'Bulk import assets from CSV',
    description:
      'dryRun=true validates every row (schema + duplicate/uniqueness checks) and returns itemized results without writing. dryRun=false commits all valid rows in a single DB transaction.',
  })
  @ApiResponse({ status: 200, description: 'Itemized per-row results' })
  async import(@Body() dto: BulkImportDto) {
    return this.bulkImport.execute({
      csv: dto.csv,
      dryRun: dto.dryRun ?? false,
    });
  }
}
