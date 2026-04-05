import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  Query,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { PaymentAccountSettingsService } from './payment-account-settings.service';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentAuditLogService } from './payment-audit-log.service';
import { 
  UpdateGlobalCommissionDto, 
  UpdateFieldCommissionDto, 
  UpdateSettingDto, 
  DateRangeQueryDto, 
  ExportReportDto, 
  PaginationQueryDto, 
  SuspendUserDto, 
  TopupWalletDto,
  ListBookingsQueryDto,
  ListFieldsQueryDto,
  ListUsersQueryDto,
  CreateFieldDto,
  UpdateFieldDto,
  UpdateFieldStatusDto,
  UpdateSettingsDto,
  PlatformWalletWithdrawDto,
  PayoutMethod,
} from './dto';
import { CreatePaymentAccountDto, UpdatePaymentAccountDto } from './dto/payment-account-settings.dto';
import { RejectPaymentDto, ListPendingPaymentsDto } from './dto/payment-verification.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Response } from 'express';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly paymentAccountSettingsService: PaymentAccountSettingsService,
    private readonly paymentVerificationService: PaymentVerificationService,
    private readonly paymentAuditLogService: PaymentAuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('commission/global')
  async getGlobalCommissionRate() {
    const commissionRate = await this.adminService.getGlobalCommissionRate();
    return {
      success: true,
      data: { commissionRate },
      message: {
        en: 'Global commission rate retrieved successfully',
        ar: 'تم استرجاع معدل العمولة العالمي بنجاح',
      },
    };
  }

  @Patch('commission/global')
  @HttpCode(HttpStatus.OK)
  async updateGlobalCommissionRate(
    @Body() updateGlobalCommissionDto: UpdateGlobalCommissionDto,
  ) {
    const commissionRate = await this.adminService.updateGlobalCommissionRate(
      updateGlobalCommissionDto.commissionRate,
    );

    return {
      success: true,
      data: { commissionRate },
      message: {
        en: 'Global commission rate updated successfully',
        ar: 'تم تحديث معدل العمولة العالمي بنجاح',
      },
    };
  }

  @Get('fields/:fieldId/commission')
  async getFieldCommissionRate(@Param('fieldId') fieldId: string) {
    const commissionRate = await this.adminService.resolveCommissionRate(fieldId);
    return {
      success: true,
      data: { fieldId, commissionRate },
      message: {
        en: 'Field commission rate retrieved successfully',
        ar: 'تم استرجاع معدل عمولة الملعب بنجاح',
      },
    };
  }

  @Patch('fields/:fieldId/commission')
  @HttpCode(HttpStatus.OK)
  async updateFieldCommissionRate(
    @Param('fieldId') fieldId: string,
    @Body() updateFieldCommissionDto: UpdateFieldCommissionDto,
  ) {
    const field = await this.adminService.updateFieldCommissionRate(
      fieldId,
      updateFieldCommissionDto.commissionRate,
    );

    return {
      success: true,
      data: field,
      message: {
        en: updateFieldCommissionDto.commissionRate === null
          ? 'Field commission rate override removed successfully'
          : 'Field commission rate updated successfully',
        ar: updateFieldCommissionDto.commissionRate === null
          ? 'تم إزالة تجاوز معدل عمولة الملعب بنجاح'
          : 'تم تحديث معدل عمولة الملعب بنجاح',
      },
    };
  }

  @Get('settings')
  async getAllSettings() {
    const settings = await this.adminService.getAllSettings();
    return {
      success: true,
      data: { settings },
      message: {
        en: 'Settings retrieved successfully',
        ar: 'تم استرجاع الإعدادات بنجاح',
      },
    };
  }

  @Get('settings/:key')
  async getSetting(@Param('key') key: string) {
    const setting = await this.adminService.getSetting(key);
    return {
      success: true,
      data: setting,
      message: {
        en: 'Setting retrieved successfully',
        ar: 'تم استرجاع الإعداد بنجاح',
      },
    };
  }

  @Patch('settings/:key')
  @HttpCode(HttpStatus.OK)
  async updateSetting(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    const setting = await this.adminService.updateSetting(
      key,
      updateSettingDto.value,
    );

    return {
      success: true,
      data: setting,
      message: {
        en: 'Setting updated successfully',
        ar: 'تم تحديث الإعداد بنجاح',
      },
    };
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.adminService.deleteReview(id, userId);

    return {
      success: true,
      data: result,
      message: {
        en: 'Review deleted successfully',
        ar: 'تم حذف المراجعة بنجاح',
      },
    };
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description: 'Retrieve real-time dashboard metrics including active bookings, revenue, and system statistics. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          totalRevenue: '50000.00',
          totalBookings: 1250,
          activeBookings: 45,
          totalUsers: 500,
          totalFields: 75,
        },
        message: {
          en: 'Dashboard metrics retrieved successfully',
          ar: 'تم استرجاع مقاييس لوحة التحكم بنجاح',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getDashboard() {
    const metrics = await this.adminService.getDashboardMetrics();

    return {
      success: true,
      data: metrics,
      message: {
        en: 'Dashboard metrics retrieved successfully',
        ar: 'تم استرجاع مقاييس لوحة التحكم بنجاح',
      },
    };
  }

  @Get('reports/revenue')
  async getRevenueReport(@Query() query: DateRangeQueryDto) {
    const report = await this.adminService.getRevenueReport(
      query.startDate,
      query.endDate,
      query.groupBy,
    );

    return {
      success: true,
      data: report,
      message: {
        en: 'Revenue report retrieved successfully',
        ar: 'تم استرجاع تقرير الإيرادات بنجاح',
      },
    };
  }

  @Get('reports/bookings')
  async getBookingStatistics(@Query() query: DateRangeQueryDto) {
    const statistics = await this.adminService.getBookingStatistics(
      query.startDate,
      query.endDate,
    );

    return {
      success: true,
      data: statistics,
      message: {
        en: 'Booking statistics retrieved successfully',
        ar: 'تم استرجاع إحصائيات الحجوزات بنجاح',
      },
    };
  }

  @Get('reports/users')
  async getUserStatistics() {
    const statistics = await this.adminService.getUserStatistics();

    return {
      success: true,
      data: statistics,
      message: {
        en: 'User statistics retrieved successfully',
        ar: 'تم استرجاع إحصائيات المستخدمين بنجاح',
      },
    };
  }

  @Get('reports/fields')
  async getFieldStatistics() {
    const statistics = await this.adminService.getFieldStatistics();

    return {
      success: true,
      data: statistics,
      message: {
        en: 'Field statistics retrieved successfully',
        ar: 'تم استرجاع إحصائيات الملاعب بنجاح',
      },
    };
  }

  @Post('reports/export')
  @HttpCode(HttpStatus.OK)
  async exportReport(
    @Body() exportReportDto: ExportReportDto,
    @Res() res: Response,
  ) {
    const csvData = await this.adminService.exportReport(
      exportReportDto.reportType,
      exportReportDto.startDate,
      exportReportDto.endDate,
    );

    const filename = `${exportReportDto.reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get all users with filters',
    description: 'Retrieve paginated list of users with optional filters for email, role, verification status, and suspension status',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'isSuspended', required: false, type: Boolean })
  async getUsers(@Query() query: ListUsersQueryDto) {
    const result = await this.adminService.getUsersWithFilters(query);

    return {
      success: true,
      data: result,
      message: {
        en: 'Users retrieved successfully',
        ar: 'تم استرجاع المستخدمين بنجاح',
      },
    };
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() suspendUserDto: SuspendUserDto,
  ) {
    const user = await this.adminService.suspendUser(
      id,
      suspendUserDto.suspendedUntil ?? null,
    );

    return {
      success: true,
      data: user,
      message: {
        en: suspendUserDto.suspendedUntil
          ? 'User suspended successfully'
          : 'User unsuspended successfully',
        ar: suspendUserDto.suspendedUntil
          ? 'تم تعليق المستخدم بنجاح'
          : 'تم إلغاء تعليق المستخدم بنجاح',
      },
    };
  }

  @Post('wallet/topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Topup user wallet (Admin only)',
    description: 'Manually add balance to any user wallet. For testing and administrative purposes.',
  })
  @ApiBody({ type: TopupWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet topped up successfully',
    schema: {
      example: {
        success: true,
        data: {
          transactionId: 'tx-uuid',
          userId: 'user-uuid',
          amount: '1000.00',
          previousBalance: '500.00',
          newBalance: '1500.00',
        },
        message: {
          en: 'Wallet topped up successfully',
          ar: 'تم شحن المحفظة بنجاح',
        },
      },
    },
  })
  async topupWallet(@Body() topupWalletDto: TopupWalletDto) {
    const result = await this.adminService.topupUserWallet(
      topupWalletDto.userId,
      topupWalletDto.amount,
      topupWalletDto.description,
    );

    return {
      success: true,
      data: result,
      message: {
        en: 'Wallet topped up successfully',
        ar: 'تم شحن المحفظة بنجاح',
      },
    };
  }

  // ============================================
  // BOOKINGS MANAGEMENT
  // ============================================

  @Get('bookings')
  @ApiOperation({
    summary: 'Get all bookings with filters',
    description: 'Retrieve paginated list of bookings with filters for status, field, owner, date range, and search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PAYMENT_FAILED'] })
  @ApiQuery({ name: 'fieldId', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by booking ID, player email, or phone' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getBookings(@Query() query: ListBookingsQueryDto) {
    const result = await this.adminService.getBookings(query);

    return {
      success: true,
      data: result,
      message: {
        en: 'Bookings retrieved successfully',
        ar: 'تم استرجاع الحجوزات بنجاح',
      },
    };
  }

  // ============================================
  // FIELDS MANAGEMENT
  // ============================================

  @Get('fields')
  @ApiOperation({
    summary: 'Get all fields with filters',
    description: 'Retrieve paginated list of fields with filters for search, status, and owner',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by field name or address' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  async getFields(@Query() query: ListFieldsQueryDto) {
    const result = await this.adminService.getFields(query);

    return {
      success: true,
      data: result,
      message: {
        en: 'Fields retrieved successfully',
        ar: 'تم استرجاع الملاعب بنجاح',
      },
    };
  }

  @Post('fields')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new field',
    description: 'Admin can create a new field for any field owner',
  })
  @ApiBody({ type: CreateFieldDto })
  async createField(@Body() createFieldDto: CreateFieldDto) {
    const field = await this.adminService.createField(createFieldDto);

    return {
      success: true,
      data: field,
      message: {
        en: 'Field created successfully',
        ar: 'تم إنشاء الملعب بنجاح',
      },
    };
  }

  @Patch('fields/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a field',
    description: 'Admin can update any field details',
  })
  @ApiParam({ name: 'fieldId', type: String })
  @ApiBody({ type: UpdateFieldDto })
  async updateField(
    @Param('fieldId') fieldId: string,
    @Body() updateFieldDto: UpdateFieldDto,
  ) {
    const field = await this.adminService.updateField(fieldId, updateFieldDto);

    return {
      success: true,
      data: field,
      message: {
        en: 'Field updated successfully',
        ar: 'تم تحديث الملعب بنجاح',
      },
    };
  }

  @Delete('fields/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a field',
    description: 'Admin can soft delete a field (cannot have active bookings)',
  })
  @ApiParam({ name: 'fieldId', type: String })
  async deleteField(@Param('fieldId') fieldId: string) {
    const result = await this.adminService.deleteField(fieldId);

    return {
      success: true,
      data: result,
      message: {
        en: 'Field deleted successfully',
        ar: 'تم حذف الملعب بنجاح',
      },
    };
  }

  @Patch('fields/:fieldId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update field status',
    description: 'Update field status (ACTIVE, INACTIVE, HIDDEN, DISABLED, PENDING_APPROVAL, REJECTED)',
  })
  @ApiParam({ name: 'fieldId', type: String })
  @ApiBody({ type: UpdateFieldStatusDto })
  async updateFieldStatus(
    @Param('fieldId') fieldId: string,
    @Body() updateFieldStatusDto: UpdateFieldStatusDto,
  ) {
    const result = await this.adminService.updateFieldStatus(
      fieldId,
      updateFieldStatusDto.status,
    );

    return {
      success: true,
      data: result,
      message: {
        en: 'Field status updated successfully',
        ar: 'تم تحديث حالة الملعب بنجاح',
      },
    };
  }

  // ============================================
  // SYSTEM SETTINGS
  // ============================================

  @Get('system-settings')
  @ApiOperation({
    summary: 'Get system settings',
    description: 'Retrieve all system settings including commission, deposit, and cancellation policies',
  })
  async getSystemSettings() {
    const settings = await this.adminService.getSettings();

    return {
      success: true,
      data: settings,
      message: {
        en: 'System settings retrieved successfully',
        ar: 'تم استرجاع إعدادات النظام بنجاح',
      },
    };
  }

  @Patch('system-settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update system settings',
    description: 'Update system-wide settings for commission, deposit, and cancellation policies',
  })
  @ApiBody({ type: UpdateSettingsDto })
  async updateSystemSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    const settings = await this.adminService.updateSettings(updateSettingsDto);

    return {
      success: true,
      data: settings,
      message: {
        en: 'System settings updated successfully',
        ar: 'تم تحديث إعدادات النظام بنجاح',
      },
    };
  }

  // ============================================
  // WALLET TRANSACTIONS
  // ============================================

  // ============================================
  // WITHDRAWAL REQUESTS MANAGEMENT
  // ============================================

  // ============================================
  // PLATFORM WALLET
  // ============================================

  @Get('platform-wallet')
  @ApiOperation({ summary: 'Get platform wallet balance' })
  async getPlatformWallet() {
    const wallet = await this.adminService.getPlatformWallet();
    return { success: true, data: wallet, message: { en: 'Platform wallet retrieved', ar: 'تم استرجاع محفظة المنصة' } };
  }

  @Get('platform-wallet/summary')
  @ApiOperation({ summary: 'Get platform wallet financial summary' })
  async getPlatformWalletSummary() {
    const summary = await this.adminService.getPlatformWalletSummary();
    return { success: true, data: summary, message: { en: 'Platform wallet summary retrieved', ar: 'تم استرجاع ملخص محفظة المنصة' } };
  }

  @Get('platform-wallet/transactions')
  @ApiOperation({ summary: 'Get platform wallet transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'bookingId', required: false, type: String })
  async getPlatformWalletTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('bookingId') bookingId?: string,
  ) {
    const result = await this.adminService.getPlatformWalletTransactions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      type,
      bookingId,
    );
    return { success: true, data: result, message: { en: 'Platform transactions retrieved', ar: 'تم استرجاع معاملات المنصة' } };
  }

  @Post('platform-wallet/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from platform wallet (Admin only)' })
  @ApiBody({
    schema: {
      oneOf: [
        {
          title: 'Mobile Wallet',
          example: {
            amount: 100,
            description: 'Platform withdrawal',
            reference: 'PLATFORM-W-001',
            payoutMethod: 'MOBILE_WALLET',
            phoneNumber: '01012345678',
            walletProvider: 'VODAFONE',
            accountHolderName: 'Admin Name',
          },
        },
        {
          title: 'InstaPay',
          example: {
            amount: 100,
            description: 'Platform withdrawal',
            reference: 'PLATFORM-W-002',
            payoutMethod: 'INSTAPAY',
            accountDetails: 'name@instapay',
            accountHolderName: 'Admin Name',
          },
        },
      ],
    },
  })
  async platformWalletWithdraw(@Body() body: PlatformWalletWithdrawDto) {
    const { amount, description, reference, payoutMethod, accountHolderName } = body;

    let payoutDetails: Record<string, any>;

    if (payoutMethod === PayoutMethod.MOBILE_WALLET) {
      payoutDetails = {
        phoneNumber: body.phoneNumber,
        walletProvider: body.walletProvider,
        accountHolderName,
      };
    } else {
      payoutDetails = {
        accountDetails: body.accountDetails,
        accountHolderName,
      };
    }

    const result = await this.adminService.platformWalletWithdraw(
      amount,
      payoutMethod,
      payoutDetails,
      description,
      reference,
    );

    return {
      success: true,
      data: result,
      message: { en: 'Platform withdrawal processed', ar: 'تم سحب المبلغ من محفظة المنصة' },
    };
  }

  @Get('withdrawal-requests')
  @ApiOperation({ summary: 'Get all withdrawal requests' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWithdrawalRequests(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getWithdrawalRequests(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );

    return {
      success: true,
      data: result,
      message: { en: 'Withdrawal requests retrieved', ar: 'تم استرجاع طلبات السحب' },
    };
  }

  @Post('withdrawal-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a withdrawal request' })
  async approveWithdrawalRequest(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() body: { transactionRef?: string },
  ) {
    const result = await this.adminService.approveWithdrawalRequest(id, adminId, body.transactionRef);

    return {
      success: true,
      data: result,
      message: { en: 'Withdrawal request approved', ar: 'تمت الموافقة على طلب السحب' },
    };
  }

  @Post('withdrawal-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a withdrawal request' })
  async rejectWithdrawalRequest(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() body: { adminNote: string },
  ) {
    const result = await this.adminService.rejectWithdrawalRequest(id, adminId, body.adminNote);

    return {
      success: true,
      data: result,
      message: { en: 'Withdrawal request rejected', ar: 'تم رفض طلب السحب' },
    };
  }

  @Get('wallet/transactions')
  @ApiOperation({
    summary: 'Get wallet transactions history',
    description: 'Retrieve paginated list of all wallet transactions with filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getWalletTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.adminService.getWalletTransactions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      type,
      startDate,
      endDate,
    });

    return {
      success: true,
      data: result,
      message: {
        en: 'Wallet transactions retrieved successfully',
        ar: 'تم استرجاع معاملات المحفظة بنجاح',
      },
    };
  }

  // ============================================
  // MANUAL PAYMENT VERIFICATION ENDPOINTS
  // ============================================

  @Post('payment-accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add payment account settings for manual payments' })
  @ApiBody({ type: CreatePaymentAccountDto })
  async createPaymentAccount(@Body() dto: CreatePaymentAccountDto) {
    const account = await this.paymentAccountSettingsService.createAccount(dto);
    return {
      success: true,
      data: account,
      message: {
        en: 'Payment account created successfully',
        ar: 'تم إنشاء حساب الدفع بنجاح',
      },
    };
  }

  @Patch('payment-accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update payment account settings' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePaymentAccountDto })
  async updatePaymentAccount(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentAccountDto,
  ) {
    const account = await this.paymentAccountSettingsService.updateAccount(id, dto);
    return {
      success: true,
      data: account,
      message: {
        en: 'Payment account updated successfully',
        ar: 'تم تحديث حساب الدفع بنجاح',
      },
    };
  }

  @Get('payment-accounts')
  @ApiOperation({ summary: 'Get all payment account settings' })
  async getPaymentAccounts() {
    const accounts = await this.paymentAccountSettingsService.getAllAccounts();
    return {
      success: true,
      data: accounts,
      message: {
        en: 'Payment accounts retrieved successfully',
        ar: 'تم استرجاع حسابات الدفع بنجاح',
      },
    };
  }

  @Delete('payment-accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete payment account settings' })
  @ApiParam({ name: 'id', type: String })
  async deletePaymentAccount(@Param('id') id: string) {
    await this.paymentAccountSettingsService.deleteAccount(id);
    return {
      success: true,
      message: {
        en: 'Payment account deleted successfully',
        ar: 'تم حذف حساب الدفع بنجاح',
      },
    };
  }

  @Get('payments/pending-verification')
  @ApiOperation({ summary: 'Get pending payment verifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: ['VODAFONE_CASH', 'INSTAPAY'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getPendingVerifications(@Query() dto: ListPendingPaymentsDto) {
    const result = await this.paymentVerificationService.getPendingPayments(dto);
    return {
      success: true,
      data: result,
      message: {
        en: 'Pending verifications retrieved successfully',
        ar: 'تم استرجاع التحققات المعلقة بنجاح',
      },
    };
  }

  @Post('payments/:id/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock payment for verification' })
  @ApiParam({ name: 'id', type: String })
  async lockPayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const result = await this.paymentVerificationService.lockPayment(id, adminId);
    return {
      success: true,
      data: result,
      message: {
        en: 'Payment locked successfully',
        ar: 'تم قفل الدفع بنجاح',
      },
    };
  }

  @Post('payments/:id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock payment' })
  @ApiParam({ name: 'id', type: String })
  async unlockPayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const result = await this.paymentVerificationService.unlockPayment(id, adminId);
    return {
      success: true,
      data: result,
      message: {
        en: 'Payment unlocked successfully',
        ar: 'تم فتح قفل الدفع بنجاح',
      },
    };
  }

  @Post('payments/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve payment verification' })
  @ApiParam({ name: 'id', type: String })
  async approvePayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const result = await this.paymentVerificationService.approvePayment(id, adminId);
    return {
      success: true,
      data: result,
      message: {
        en: 'Payment approved successfully',
        ar: 'تم الموافقة على الدفع بنجاح',
      },
    };
  }

  @Post('payments/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject payment verification' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: RejectPaymentDto })
  async rejectPayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: RejectPaymentDto,
  ) {
    const result = await this.paymentVerificationService.rejectPayment(id, adminId, dto.reason);
    return {
      success: true,
      data: result,
      message: {
        en: 'Payment rejected successfully',
        ar: 'تم رفض الدفع بنجاح',
      },
    };
  }

  @Get('payments/verification-statistics')
  @ApiOperation({ summary: 'Get payment verification statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getVerificationStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.paymentVerificationService.getVerificationStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: stats,
      message: {
        en: 'Statistics retrieved successfully',
        ar: 'تم استرجاع الإحصائيات بنجاح',
      },
    };
  }

  @Get('payments/flagged')
  @ApiOperation({ summary: 'Get flagged payments for fraud review' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFlaggedPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          isFlagged: true,
          gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
        },
        include: {
          booking: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
              field: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.payment.count({
        where: {
          isFlagged: true,
          gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      message: {
        en: 'Flagged payments retrieved successfully',
        ar: 'تم استرجاع المدفوعات المعلمة بنجاح',
      },
    };
  }

  @Post('payments/:id/flag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flag payment for fraud review' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
      },
      required: ['reason'],
    },
  })
  async flagPayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() body: { reason: string },
  ) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        isFlagged: true,
        flagReason: body.reason,
      },
    });

    await this.paymentAuditLogService.log({
      paymentId: id,
      adminId,
      action: 'FLAGGED',
      metadata: { reason: body.reason },
    });

    return {
      success: true,
      data: payment,
      message: {
        en: 'Payment flagged successfully',
        ar: 'تم تعليم الدفع بنجاح',
      },
    };
  }

  @Post('payments/:id/unflag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove fraud flag from payment' })
  @ApiParam({ name: 'id', type: String })
  async unflagPayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        isFlagged: false,
        flagReason: null,
      },
    });

    await this.paymentAuditLogService.log({
      paymentId: id,
      adminId,
      action: 'UNFLAGGED',
    });

    return {
      success: true,
      data: payment,
      message: {
        en: 'Payment unflagged successfully',
        ar: 'تم إزالة العلامة من الدفع بنجاح',
      },
    };
  }

  @Get('payments/:id/audit-logs')
  @ApiOperation({ summary: 'Get audit logs for a payment' })
  @ApiParam({ name: 'id', type: String })
  async getPaymentAuditLogs(@Param('id') id: string) {
    const logs = await this.paymentAuditLogService.getPaymentLogs(id);
    return {
      success: true,
      data: logs,
      message: {
        en: 'Audit logs retrieved successfully',
        ar: 'تم استرجاع سجلات التدقيق بنجاح',
      },
    };
  }

  @Get('audit-logs/my-actions')
  @ApiOperation({ summary: 'Get my verification actions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyAuditLogs(
    @CurrentUser('userId') adminId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.paymentAuditLogService.getAdminLogs(
      adminId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      success: true,
      data: logs,
      message: {
        en: 'Your actions retrieved successfully',
        ar: 'تم استرجاع إجراءاتك بنجاح',
      },
    };
  }

  @Get('audit-logs/all-admins-performance')
  @ApiOperation({ summary: 'Get all admins verification performance' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAllAdminsPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const performance = await this.paymentAuditLogService.getAdminPerformance(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: performance,
      message: {
        en: 'Admin performance retrieved successfully',
        ar: 'تم استرجاع أداء المسؤولين بنجاح',
      },
    };
  }
}
