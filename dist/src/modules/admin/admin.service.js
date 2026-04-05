"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const platform_wallet_service_1 = require("../platform-wallet/platform-wallet.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(prisma, platformWalletService) {
        this.prisma = prisma;
        this.platformWalletService = platformWalletService;
        this.logger = new common_1.Logger(AdminService_1.name);
        this.GLOBAL_COMMISSION_KEY = 'global_commission_rate';
        this.DEFAULT_COMMISSION_RATE = 10;
    }
    async getGlobalCommissionRate() {
        const setting = await this.prisma.appSetting.findUnique({
            where: { key: this.GLOBAL_COMMISSION_KEY },
        });
        if (!setting) {
            this.logger.log(`Global commission rate not found, returning default: ${this.DEFAULT_COMMISSION_RATE}%`);
            return this.DEFAULT_COMMISSION_RATE;
        }
        return parseFloat(setting.value);
    }
    async updateGlobalCommissionRate(commissionRate) {
        if (commissionRate < 0 || commissionRate > 100) {
            throw new common_1.BadRequestException('Commission rate must be between 0 and 100');
        }
        const setting = await this.prisma.appSetting.upsert({
            where: { key: this.GLOBAL_COMMISSION_KEY },
            update: {
                value: commissionRate.toString(),
                dataType: 'number',
            },
            create: {
                key: this.GLOBAL_COMMISSION_KEY,
                value: commissionRate.toString(),
                dataType: 'number',
            },
        });
        this.logger.log(`Global commission rate updated to ${commissionRate}% by admin`);
        return parseFloat(setting.value);
    }
    async updateFieldCommissionRate(fieldId, commissionRate) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
        });
        if (!field) {
            throw new common_1.NotFoundException(`Field with ID ${fieldId} not found`);
        }
        if (field.deletedAt) {
            throw new common_1.BadRequestException('Cannot update commission rate for deleted field');
        }
        if (commissionRate !== null && (commissionRate < 0 || commissionRate > 100)) {
            throw new common_1.BadRequestException('Commission rate must be between 0 and 100');
        }
        if (commissionRate !== null) {
            const depositSetting = await this.prisma.appSetting.findUnique({
                where: { key: 'deposit_percentage' },
            });
            const depositPercentage = depositSetting
                ? parseFloat(depositSetting.value)
                : 100;
            if (commissionRate > depositPercentage) {
                throw new common_1.BadRequestException(`Field commission rate (${commissionRate}%) cannot exceed global deposit percentage (${depositPercentage}%). Please increase deposit percentage first or lower the commission rate.`);
            }
        }
        const updatedField = await this.prisma.field.update({
            where: { id: fieldId },
            data: {
                commissionRate: commissionRate !== null ? new library_1.Decimal(commissionRate) : null,
            },
        });
        if (commissionRate === null) {
            this.logger.log(`Field-specific commission rate removed for field ${fieldId}. Will use global rate.`);
        }
        else {
            this.logger.log(`Field-specific commission rate set to ${commissionRate}% for field ${fieldId}`);
        }
        return {
            id: updatedField.id,
            name: updatedField.name,
            commissionRate: updatedField.commissionRate
                ? parseFloat(updatedField.commissionRate.toString())
                : null,
        };
    }
    async resolveCommissionRate(fieldId) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
            select: { commissionRate: true },
        });
        if (!field) {
            throw new common_1.NotFoundException(`Field with ID ${fieldId} not found`);
        }
        if (field.commissionRate !== null) {
            return parseFloat(field.commissionRate.toString());
        }
        return this.getGlobalCommissionRate();
    }
    async getAllSettings() {
        const settings = await this.prisma.appSetting.findMany({
            orderBy: { key: 'asc' },
        });
        return settings.map((setting) => ({
            key: setting.key,
            value: setting.value,
            dataType: setting.dataType,
            updatedAt: setting.updatedAt,
        }));
    }
    async getSetting(key) {
        const setting = await this.prisma.appSetting.findUnique({
            where: { key },
        });
        if (!setting) {
            throw new common_1.NotFoundException(`Setting with key '${key}' not found`);
        }
        return {
            key: setting.key,
            value: setting.value,
            dataType: setting.dataType,
            updatedAt: setting.updatedAt,
        };
    }
    async updateSetting(key, value, dataType = 'string') {
        if (dataType === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                throw new common_1.BadRequestException(`Invalid number value for setting '${key}'`);
            }
            if (key === 'global_commission_rate') {
                if (numValue < 0 || numValue > 100) {
                    throw new common_1.BadRequestException('Commission rate must be between 0% and 100%');
                }
                const depositSetting = await this.prisma.appSetting.findUnique({
                    where: { key: 'deposit_percentage' },
                });
                if (depositSetting) {
                    const currentDeposit = parseFloat(depositSetting.value);
                    if (currentDeposit < numValue) {
                        throw new common_1.BadRequestException(`Cannot set commission rate to ${numValue}% because current deposit percentage (${currentDeposit}%) is lower. Please increase deposit percentage first or it will be automatically adjusted.`);
                    }
                }
            }
            if (key === 'deposit_percentage') {
                const commissionSetting = await this.prisma.appSetting.findUnique({
                    where: { key: 'global_commission_rate' },
                });
                const commissionRate = commissionSetting
                    ? parseFloat(commissionSetting.value)
                    : 10;
                if (numValue < commissionRate) {
                    throw new common_1.BadRequestException(`Deposit percentage must be at least ${commissionRate}% (current commission rate). Minimum deposit must equal or exceed commission rate.`);
                }
                if (numValue > 100) {
                    throw new common_1.BadRequestException('Deposit percentage cannot exceed 100%');
                }
                const fieldsWithHighCommission = await this.prisma.field.findMany({
                    where: {
                        commissionRate: {
                            gt: new library_1.Decimal(numValue),
                        },
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        name: true,
                        commissionRate: true,
                    },
                });
                if (fieldsWithHighCommission.length > 0) {
                    const fieldsList = fieldsWithHighCommission
                        .map(f => `${f.name} (${f.commissionRate}%)`)
                        .join(', ');
                    throw new common_1.BadRequestException(`Cannot set deposit percentage to ${numValue}% because ${fieldsWithHighCommission.length} field(s) have higher custom commission rates: ${fieldsList}. Please adjust field commission rates first.`);
                }
            }
        }
        const setting = await this.prisma.appSetting.upsert({
            where: { key },
            update: {
                value,
                dataType,
            },
            create: {
                key,
                value,
                dataType,
            },
        });
        this.logger.log(`Setting '${key}' updated to '${value}' by admin`);
        return {
            key: setting.key,
            value: setting.value,
            dataType: setting.dataType,
            updatedAt: setting.updatedAt,
        };
    }
    async deleteReview(reviewId, adminId) {
        const review = await this.prisma.review.findFirst({
            where: {
                id: reviewId,
                deletedAt: null,
            },
        });
        if (!review) {
            throw new common_1.NotFoundException(`Review with ID ${reviewId} not found`);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.review.update({
                where: { id: reviewId },
                data: {
                    deletedAt: new Date(),
                },
            });
            const reviews = await tx.review.findMany({
                where: {
                    fieldId: review.fieldId,
                    deletedAt: null,
                },
                select: {
                    rating: true,
                },
            });
            const averageRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;
            await tx.field.update({
                where: { id: review.fieldId },
                data: {
                    averageRating,
                    totalReviews: reviews.length,
                },
            });
        });
        this.logger.log(`Review ${reviewId} deleted by admin ${adminId}`);
        return { message: 'Review deleted successfully' };
    }
    async getDashboardMetrics() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const activeBookings = await this.prisma.booking.count({
            where: {
                status: {
                    in: ['CONFIRMED', 'CHECKED_IN'],
                },
            },
        });
        const pendingPayments = await this.prisma.booking.count({
            where: {
                status: 'PENDING_PAYMENT',
            },
        });
        const totalUsers = await this.prisma.user.count({
            where: {
                deletedAt: null,
            },
        });
        const totalFields = await this.prisma.field.count({
            where: {
                deletedAt: null,
            },
        });
        const totalBookings = await this.prisma.booking.count();
        const todayRevenue = await this.prisma.revenue.aggregate({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            _sum: {
                commissionAmount: true,
            },
        });
        const todayCommission = todayRevenue._sum.commissionAmount
            ? parseFloat(todayRevenue._sum.commissionAmount.toString())
            : 0;
        const todayBookings = await this.prisma.booking.aggregate({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
                status: {
                    in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
                },
            },
            _sum: {
                totalPrice: true,
            },
        });
        const todayRevenueTotal = todayBookings._sum.totalPrice
            ? parseFloat(todayBookings._sum.totalPrice.toString())
            : 0;
        return {
            activeBookings,
            pendingPayments,
            totalUsers,
            totalFields,
            totalBookings,
            todayRevenue: todayRevenueTotal,
            todayCommission,
        };
    }
    async getRevenueReport(startDate, endDate, groupBy) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const revenueByGateway = await this.prisma.revenue.groupBy({
            by: ['gateway'],
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                commissionAmount: true,
            },
        });
        const revenueByField = await this.prisma.revenue.groupBy({
            by: ['fieldId'],
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                commissionAmount: true,
            },
            _count: {
                bookingId: true,
            },
        });
        const fieldIds = revenueByField.map((r) => r.fieldId);
        const fields = await this.prisma.field.findMany({
            where: {
                id: {
                    in: fieldIds,
                },
            },
            select: {
                id: true,
                name: true,
            },
        });
        const fieldMap = new Map(fields.map((f) => [f.id, f.name]));
        const totalCommission = revenueByGateway.reduce((sum, r) => sum + (r._sum.commissionAmount ? parseFloat(r._sum.commissionAmount.toString()) : 0), 0);
        let revenueByDate = [];
        if (groupBy) {
            const revenues = await this.prisma.revenue.findMany({
                where: {
                    createdAt: {
                        gte: start,
                        lte: end,
                    },
                },
                select: {
                    createdAt: true,
                    commissionAmount: true,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
            const groupedData = new Map();
            revenues.forEach((revenue) => {
                let key;
                const date = new Date(revenue.createdAt);
                if (groupBy === 'day') {
                    key = date.toISOString().split('T')[0];
                }
                else if (groupBy === 'week') {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                }
                else if (groupBy === 'month') {
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }
                else {
                    key = date.toISOString().split('T')[0];
                }
                const amount = parseFloat(revenue.commissionAmount.toString());
                groupedData.set(key, (groupedData.get(key) || 0) + amount);
            });
            revenueByDate = Array.from(groupedData.entries()).map(([date, amount]) => ({
                date,
                commission: amount,
            }));
        }
        return {
            totalCommission,
            byGateway: revenueByGateway.map((r) => ({
                gateway: r.gateway,
                commission: r._sum.commissionAmount
                    ? parseFloat(r._sum.commissionAmount.toString())
                    : 0,
            })),
            byField: revenueByField.map((r) => ({
                fieldId: r.fieldId,
                fieldName: fieldMap.get(r.fieldId) || 'Unknown',
                commission: r._sum.commissionAmount
                    ? parseFloat(r._sum.commissionAmount.toString())
                    : 0,
                bookingCount: r._count.bookingId,
            })),
            byDate: revenueByDate,
        };
    }
    async getBookingStatistics(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const bookingsByStatus = await this.prisma.booking.groupBy({
            by: ['status'],
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _count: {
                id: true,
            },
        });
        const totalBookings = bookingsByStatus.reduce((sum, b) => sum + b._count.id, 0);
        const cancelled = bookingsByStatus.find((b) => b.status === 'CANCELLED')?._count.id || 0;
        const noShows = bookingsByStatus.find((b) => b.status === 'NO_SHOW')?._count.id || 0;
        const completed = bookingsByStatus.find((b) => b.status === 'COMPLETED')?._count.id || 0;
        const confirmed = bookingsByStatus.find((b) => b.status === 'CONFIRMED')?._count.id || 0;
        const checkedIn = bookingsByStatus.find((b) => b.status === 'CHECKED_IN')?._count.id || 0;
        const totalFinalized = completed + cancelled + noShows;
        const completionRate = totalFinalized > 0 ? (completed / totalFinalized) * 100 : 0;
        const bookingsByDate = await this.prisma.booking.groupBy({
            by: ['scheduledDate'],
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _count: {
                id: true,
            },
            orderBy: {
                scheduledDate: 'asc',
            },
        });
        return {
            totalBookings,
            byStatus: {
                cancelled,
                noShows,
                completed,
                confirmed,
                checkedIn,
                pendingPayment: bookingsByStatus.find((b) => b.status === 'PENDING_PAYMENT')?._count.id || 0,
                paymentFailed: bookingsByStatus.find((b) => b.status === 'PAYMENT_FAILED')?._count.id || 0,
            },
            completionRate: parseFloat(completionRate.toFixed(2)),
            byDate: bookingsByDate.map((b) => ({
                date: b.scheduledDate.toISOString().split('T')[0],
                count: b._count.id,
            })),
        };
    }
    async getUserStatistics() {
        const usersByRole = await this.prisma.user.groupBy({
            by: ['role'],
            where: {
                deletedAt: null,
            },
            _count: {
                id: true,
            },
        });
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const registrationsByMonth = await this.prisma.user.findMany({
            where: {
                createdAt: {
                    gte: twelveMonthsAgo,
                },
                deletedAt: null,
            },
            select: {
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        const monthlyRegistrations = new Map();
        registrationsByMonth.forEach((user) => {
            const date = new Date(user.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyRegistrations.set(key, (monthlyRegistrations.get(key) || 0) + 1);
        });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers = await this.prisma.user.count({
            where: {
                deletedAt: null,
                bookings: {
                    some: {
                        createdAt: {
                            gte: thirtyDaysAgo,
                        },
                    },
                },
            },
        });
        return {
            totalUsers: usersByRole.reduce((sum, u) => sum + u._count.id, 0),
            byRole: {
                players: usersByRole.find((u) => u.role === 'PLAYER')?._count.id || 0,
                fieldOwners: usersByRole.find((u) => u.role === 'FIELD_OWNER')?._count.id || 0,
                admins: usersByRole.find((u) => u.role === 'ADMIN')?._count.id || 0,
            },
            activeUsers,
            registrationTrends: Array.from(monthlyRegistrations.entries()).map(([month, count]) => ({
                month,
                count,
            })),
        };
    }
    async getFieldStatistics() {
        const fields = await this.prisma.field.findMany({
            where: {
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                address: true,
                averageRating: true,
                totalReviews: true,
                ownerId: true,
                owner: {
                    select: {
                        email: true,
                    },
                },
            },
        });
        const fieldStats = await Promise.all(fields.map(async (field) => {
            const bookingCount = await this.prisma.booking.count({
                where: {
                    fieldId: field.id,
                    status: {
                        in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
                    },
                },
            });
            const revenueData = await this.prisma.booking.aggregate({
                where: {
                    fieldId: field.id,
                    status: {
                        in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
                    },
                },
                _sum: {
                    totalPrice: true,
                },
            });
            const revenue = revenueData._sum.totalPrice
                ? parseFloat(revenueData._sum.totalPrice.toString())
                : 0;
            return {
                fieldId: field.id,
                fieldName: field.name,
                address: field.address,
                ownerEmail: field.owner.email,
                bookingCount,
                revenue,
                averageRating: field.averageRating,
                totalReviews: field.totalReviews,
            };
        }));
        fieldStats.sort((a, b) => b.revenue - a.revenue);
        return {
            totalFields: fields.length,
            fields: fieldStats,
        };
    }
    async exportReport(reportType, startDate, endDate) {
        let csvData = '';
        switch (reportType) {
            case 'revenue':
                const revenueReport = await this.getRevenueReport(startDate, endDate);
                csvData = this.generateRevenueCSV(revenueReport);
                break;
            case 'bookings':
                const bookingStats = await this.getBookingStatistics(startDate, endDate);
                csvData = this.generateBookingCSV(bookingStats);
                break;
            case 'users':
                const userStats = await this.getUserStatistics();
                csvData = this.generateUserCSV(userStats);
                break;
            case 'fields':
                const fieldStats = await this.getFieldStatistics();
                csvData = this.generateFieldCSV(fieldStats);
                break;
            default:
                throw new common_1.BadRequestException('Invalid report type');
        }
        return csvData;
    }
    generateRevenueCSV(report) {
        let csv = 'Gateway,Commission\n';
        report.byGateway.forEach((item) => {
            csv += `${item.gateway},${item.commission}\n`;
        });
        csv += '\nField ID,Field Name,Commission,Booking Count\n';
        report.byField.forEach((item) => {
            csv += `${item.fieldId},${item.fieldName},${item.commission},${item.bookingCount}\n`;
        });
        csv += `\nTotal Commission,${report.totalCommission}\n`;
        return csv;
    }
    generateBookingCSV(stats) {
        let csv = 'Status,Count\n';
        csv += `Cancelled,${stats.byStatus.cancelled}\n`;
        csv += `No Shows,${stats.byStatus.noShows}\n`;
        csv += `Completed,${stats.byStatus.completed}\n`;
        csv += `Confirmed,${stats.byStatus.confirmed}\n`;
        csv += `Checked In,${stats.byStatus.checkedIn}\n`;
        csv += `Pending Payment,${stats.byStatus.pendingPayment}\n`;
        csv += `Payment Failed,${stats.byStatus.paymentFailed}\n`;
        csv += `\nTotal Bookings,${stats.totalBookings}\n`;
        csv += `Completion Rate,${stats.completionRate}%\n`;
        return csv;
    }
    generateUserCSV(stats) {
        let csv = 'Role,Count\n';
        csv += `Players,${stats.byRole.players}\n`;
        csv += `Field Owners,${stats.byRole.fieldOwners}\n`;
        csv += `Admins,${stats.byRole.admins}\n`;
        csv += `\nTotal Users,${stats.totalUsers}\n`;
        csv += `Active Users (Last 30 Days),${stats.activeUsers}\n`;
        csv += '\nMonth,Registrations\n';
        stats.registrationTrends.forEach((item) => {
            csv += `${item.month},${item.count}\n`;
        });
        return csv;
    }
    generateFieldCSV(stats) {
        let csv = 'Field ID,Field Name,Address,Owner Email,Booking Count,Revenue,Average Rating,Total Reviews\n';
        stats.fields.forEach((field) => {
            csv += `${field.fieldId},${field.fieldName},${field.address},${field.ownerEmail},${field.bookingCount},${field.revenue},${field.averageRating},${field.totalReviews}\n`;
        });
        csv += `\nTotal Fields,${stats.totalFields}\n`;
        return csv;
    }
    async getUsers(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isVerified: true,
                    noShowCount: true,
                    suspendedUntil: true,
                    createdAt: true,
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.user.count({
                where: {
                    deletedAt: null,
                },
            }),
        ]);
        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async suspendUser(userId, suspendedUntil) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (user.deletedAt) {
            throw new common_1.BadRequestException('Cannot suspend deleted user');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                suspendedUntil: suspendedUntil ? new Date(suspendedUntil) : null,
            },
            select: {
                id: true,
                email: true,
                role: true,
                suspendedUntil: true,
            },
        });
        if (suspendedUntil) {
            this.logger.log(`User ${userId} suspended until ${suspendedUntil}`);
        }
        else {
            this.logger.log(`User ${userId} unsuspended`);
        }
        return updatedUser;
    }
    async topupUserWallet(userId, amount, description) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (!user.wallet) {
            throw new common_1.NotFoundException(`Wallet not found for user ${userId}`);
        }
        return this.prisma.$transaction(async (tx) => {
            const wallet = user.wallet;
            const previousBalance = wallet.balance;
            const newBalance = new client_1.Prisma.Decimal(previousBalance.toString())
                .plus(amount)
                .toDecimalPlaces(2);
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance },
            });
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: client_1.WalletTransactionType.DEPOSIT,
                    amount: new client_1.Prisma.Decimal(amount),
                    balanceBefore: previousBalance,
                    balanceAfter: newBalance,
                    description: description || 'Admin manual topup',
                    reference: `admin-topup-${Date.now()}`,
                },
            });
            return {
                transactionId: transaction.id,
                userId: user.id,
                amount: amount.toFixed(2),
                previousBalance: previousBalance.toString(),
                newBalance: newBalance.toString(),
            };
        });
    }
    async getBookings(query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.fieldId) {
            where.fieldId = query.fieldId;
        }
        if (query.ownerId) {
            where.field = {
                ownerId: query.ownerId,
            };
        }
        if (query.search) {
            where.OR = [
                { id: { contains: query.search, mode: 'insensitive' } },
                { player: { email: { contains: query.search, mode: 'insensitive' } } },
                { player: { phoneNumber: { contains: query.search, mode: 'insensitive' } } },
            ];
        }
        if (query.startDate || query.endDate) {
            where.scheduledDate = {};
            if (query.startDate) {
                where.scheduledDate.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.scheduledDate.lte = new Date(query.endDate);
            }
        }
        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
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
                            id: true,
                            name: true,
                            address: true,
                            owner: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    payment: {
                        select: {
                            status: true,
                            gateway: true,
                        },
                    },
                    qrCode: {
                        select: {
                            qrToken: true,
                            isUsed: true,
                            usedAt: true,
                        },
                    },
                    bookingStatusHistory: {
                        where: { toStatus: 'CHECKED_IN' },
                        select: { createdAt: true },
                        take: 1,
                        orderBy: { createdAt: 'asc' },
                    },
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.booking.count({ where }),
        ]);
        const formattedBookings = bookings.map((booking) => {
            const depositPaid = booking.payment?.status === 'COMPLETED';
            const remainingAmount = parseFloat(booking.totalPrice.toString()) - parseFloat(booking.depositAmount.toString());
            const checkedInAt = booking.bookingStatusHistory?.[0]?.createdAt ?? null;
            return {
                id: booking.id,
                bookingCode: `BK-${booking.id.substring(0, 8).toUpperCase()}`,
                player: {
                    id: booking.player.id,
                    name: booking.player.name || 'N/A',
                    email: booking.player.email,
                    phone: booking.player.phoneNumber || 'N/A',
                },
                field: {
                    id: booking.field.id,
                    name: booking.field.name,
                    address: booking.field.address || null,
                },
                owner: {
                    id: booking.field.owner.id,
                    name: booking.field.owner.name || 'N/A',
                    email: booking.field.owner.email,
                },
                date: booking.scheduledDate.toISOString().split('T')[0],
                startTime: booking.scheduledStartTime.toISOString().split('T')[1].substring(0, 8),
                endTime: booking.scheduledEndTime.toISOString().split('T')[1].substring(0, 8),
                status: booking.status,
                paymentStatus: depositPaid ? (remainingAmount > 0 ? 'PARTIAL' : 'FULL') : 'PENDING',
                totalPrice: parseFloat(booking.totalPrice.toString()),
                depositAmount: parseFloat(booking.depositAmount.toString()),
                remainingAmount,
                commissionAmount: parseFloat(booking.commissionAmount.toString()),
                commissionRate: parseFloat(booking.commissionRate.toString()),
                ownerRevenue: parseFloat(booking.ownerRevenue.toString()),
                refundAmount: booking.refundAmount ? parseFloat(booking.refundAmount.toString()) : 0,
                cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
                isCheckedIn: booking.status === 'CHECKED_IN' || booking.status === 'COMPLETED',
                checkedInAt: checkedInAt ? checkedInAt.toISOString() : null,
                hasQr: !!booking.qrCode,
                qrToken: booking.qrCode?.qrToken ?? null,
                qrUsed: booking.qrCode?.isUsed ?? false,
                qrUsedAt: booking.qrCode?.usedAt ? booking.qrCode.usedAt.toISOString() : null,
                createdAt: booking.createdAt.toISOString(),
                updatedAt: booking.updatedAt.toISOString(),
            };
        });
        return {
            bookings: formattedBookings,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getFields(query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            deletedAt: null,
        };
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { nameAr: { contains: query.search, mode: 'insensitive' } },
                { address: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.ownerId) {
            where.ownerId = query.ownerId;
        }
        if (query.status) {
            where.status = query.status;
        }
        const [fields, total] = await Promise.all([
            this.prisma.field.findMany({
                where,
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.field.count({ where }),
        ]);
        const globalCommission = await this.getGlobalCommissionRate();
        const formattedFields = fields.map((field) => ({
            id: field.id,
            name: field.name,
            location: field.address,
            owner: {
                id: field.owner.id,
                name: field.owner.name || 'N/A',
                email: field.owner.email,
            },
            pricePerHour: field.basePrice ? parseFloat(field.basePrice.toString()) : null,
            status: field.status ?? (field.deletedAt ? 'INACTIVE' : 'ACTIVE'),
            commissionPercentage: field.commissionRate
                ? parseFloat(field.commissionRate.toString())
                : globalCommission,
            isCustomCommission: field.commissionRate !== null,
            createdAt: field.createdAt.toISOString(),
        }));
        return {
            fields: formattedFields,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createField(data) {
        const owner = await this.prisma.user.findUnique({
            where: { id: data.ownerId },
        });
        if (!owner) {
            throw new common_1.NotFoundException(`Owner with ID ${data.ownerId} not found`);
        }
        if (owner.role !== 'FIELD_OWNER') {
            throw new common_1.BadRequestException('User must have FIELD_OWNER role');
        }
        const field = await this.prisma.field.create({
            data: {
                ownerId: data.ownerId,
                name: data.name,
                nameAr: data.nameAr,
                description: data.description,
                descriptionAr: data.descriptionAr,
                address: data.address,
                addressAr: data.addressAr,
                latitude: data.latitude,
                longitude: data.longitude,
                basePrice: data.basePrice ? new library_1.Decimal(data.basePrice) : null,
                commissionRate: data.commissionRate ? new library_1.Decimal(data.commissionRate) : null,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        this.logger.log(`Field ${field.id} created by admin for owner ${data.ownerId}`);
        return field;
    }
    async updateField(fieldId, data) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
        });
        if (!field) {
            throw new common_1.NotFoundException(`Field with ID ${fieldId} not found`);
        }
        if (field.deletedAt) {
            throw new common_1.BadRequestException('Cannot update deleted field');
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.nameAr !== undefined)
            updateData.nameAr = data.nameAr;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.descriptionAr !== undefined)
            updateData.descriptionAr = data.descriptionAr;
        if (data.address !== undefined)
            updateData.address = data.address;
        if (data.addressAr !== undefined)
            updateData.addressAr = data.addressAr;
        if (data.latitude !== undefined)
            updateData.latitude = data.latitude;
        if (data.longitude !== undefined)
            updateData.longitude = data.longitude;
        if (data.basePrice !== undefined)
            updateData.basePrice = new library_1.Decimal(data.basePrice);
        if (data.commissionRate !== undefined) {
            updateData.commissionRate = data.commissionRate !== null ? new library_1.Decimal(data.commissionRate) : null;
        }
        const updatedField = await this.prisma.field.update({
            where: { id: fieldId },
            data: updateData,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        this.logger.log(`Field ${fieldId} updated by admin`);
        return updatedField;
    }
    async updateFieldStatus(fieldId, status) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
        });
        if (!field) {
            throw new common_1.NotFoundException(`Field with ID ${fieldId} not found`);
        }
        if (field.deletedAt) {
            throw new common_1.BadRequestException('Cannot update status of a deleted field');
        }
        const updated = await this.prisma.field.update({
            where: { id: fieldId },
            data: { status: status },
            select: { id: true, name: true, status: true, updatedAt: true },
        });
        this.logger.log(`Field ${fieldId} status updated to ${status} by admin`);
        return updated;
    }
    async deleteField(fieldId) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
        });
        if (!field) {
            throw new common_1.NotFoundException({
                code: 'FIELD_NOT_FOUND',
                message: { en: `Field not found`, ar: 'الملعب غير موجود' },
            });
        }
        if (field.deletedAt) {
            throw new common_1.BadRequestException({
                code: 'FIELD_ALREADY_DELETED',
                message: { en: 'Field is already deleted', ar: 'الملعب محذوف بالفعل' },
            });
        }
        const activeBookings = await this.prisma.booking.count({
            where: {
                fieldId,
                status: {
                    in: ['CONFIRMED', 'CHECKED_IN', 'PENDING_PAYMENT'],
                },
            },
        });
        if (activeBookings > 0) {
            throw new common_1.BadRequestException({
                code: 'FIELD_HAS_ACTIVE_BOOKINGS',
                message: {
                    en: `Cannot delete field with ${activeBookings} active booking(s). Please cancel or complete them first.`,
                    ar: `لا يمكن حذف الملعب لوجود ${activeBookings} حجز نشط. يرجى إلغاء أو إتمام الحجوزات أولاً.`,
                },
            });
        }
        await this.prisma.field.update({
            where: { id: fieldId },
            data: {
                deletedAt: new Date(),
            },
        });
        this.logger.log(`Field ${fieldId} deleted by admin`);
        return { fieldId, message: 'Field deleted successfully' };
    }
    async getUsersWithFilters(query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            deletedAt: null,
        };
        if (query.email) {
            where.email = {
                contains: query.email,
                mode: 'insensitive',
            };
        }
        if (query.role) {
            where.role = query.role;
        }
        if (query.isVerified !== undefined) {
            where.isVerified = query.isVerified;
        }
        if (query.isSuspended !== undefined) {
            if (query.isSuspended) {
                where.suspendedUntil = {
                    not: null,
                    gte: new Date(),
                };
            }
            else {
                where.OR = [
                    { suspendedUntil: null },
                    { suspendedUntil: { lt: new Date() } },
                ];
            }
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isVerified: true,
                    phoneNumber: true,
                    isSuspended: true,
                    suspendedUntil: true,
                    noShowCount: true,
                    createdAt: true,
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getSettings() {
        const globalCommission = await this.getGlobalCommissionRate();
        const depositSetting = await this.prisma.appSetting.findUnique({
            where: { key: 'deposit_percentage' },
        });
        const cancellationWindowSetting = await this.prisma.appSetting.findUnique({
            where: { key: 'cancellation_refund_window_hours' },
        });
        return {
            globalCommissionPercentage: globalCommission,
            depositPercentage: depositSetting ? parseFloat(depositSetting.value) : 20,
            cancellationRefundWindowHours: cancellationWindowSetting
                ? parseFloat(cancellationWindowSetting.value)
                : 3,
        };
    }
    async updateSettings(data) {
        const updates = {};
        if (data.globalCommissionPercentage !== undefined) {
            await this.updateGlobalCommissionRate(data.globalCommissionPercentage);
            updates.globalCommissionPercentage = data.globalCommissionPercentage;
        }
        if (data.depositPercentage !== undefined) {
            await this.updateSetting('deposit_percentage', data.depositPercentage.toString(), 'number');
            updates.depositPercentage = data.depositPercentage;
        }
        if (data.cancellationRefundWindowHours !== undefined) {
            await this.updateSetting('cancellation_refund_window_hours', data.cancellationRefundWindowHours.toString(), 'number');
            updates.cancellationRefundWindowHours = data.cancellationRefundWindowHours;
        }
        this.logger.log('System settings updated by admin');
        return await this.getSettings();
    }
    async getWalletTransactions(query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.userId) {
            where.wallet = {
                userId: query.userId,
            };
        }
        if (query.type) {
            where.type = query.type;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) {
                where.createdAt.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.createdAt.lte = new Date(query.endDate);
            }
        }
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where,
                include: {
                    wallet: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.walletTransaction.count({ where }),
        ]);
        const formattedTransactions = transactions.map((tx) => ({
            id: tx.id,
            user: {
                id: tx.wallet.user.id,
                email: tx.wallet.user.email,
                name: tx.wallet.user.name || 'N/A',
            },
            type: tx.type,
            amount: parseFloat(tx.amount.toString()),
            balanceBefore: parseFloat(tx.balanceBefore.toString()),
            balanceAfter: parseFloat(tx.balanceAfter.toString()),
            description: tx.description,
            reference: tx.reference,
            metadata: tx.metadata,
            createdAt: tx.createdAt.toISOString(),
        }));
        return {
            transactions: formattedTransactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getPlatformWallet() {
        return this.platformWalletService.getWallet();
    }
    async getPlatformWalletSummary() {
        const wallet = await this.platformWalletService.getWallet();
        const [deposits, refunds, withdrawals, adjustments] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS count
        FROM "PlatformWalletTransaction"
        WHERE "platformWalletId" = 'platform-wallet-001'
          AND type = 'BOOKING_DEPOSIT'::"PlatformTransactionType"
      `,
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS count
        FROM "PlatformWalletTransaction"
        WHERE "platformWalletId" = 'platform-wallet-001'
          AND type = 'BOOKING_REFUND'::"PlatformTransactionType"
      `,
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS count
        FROM "PlatformWalletTransaction"
        WHERE "platformWalletId" = 'platform-wallet-001'
          AND type = 'ADMIN_WITHDRAWAL'::"PlatformTransactionType"
      `,
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS count
        FROM "PlatformWalletTransaction"
        WHERE "platformWalletId" = 'platform-wallet-001'
          AND type = 'MANUAL_ADJUSTMENT'::"PlatformTransactionType"
      `,
        ]);
        const refundLiability = await this.prisma.$queryRaw `
      SELECT COALESCE(SUM("depositAmount"), 0)::text AS total
      FROM "Booking"
      WHERE status = 'CONFIRMED'::"BookingStatus"
    `;
        const totalCollected = parseFloat(deposits[0]?.total ?? '0');
        const totalRefunded = parseFloat(refunds[0]?.total ?? '0');
        const totalWithdrawn = parseFloat(withdrawals[0]?.total ?? '0');
        const totalAdjustments = parseFloat(adjustments[0]?.total ?? '0');
        return {
            currentBalance: wallet.balance,
            totalCollected,
            totalRefunded,
            totalWithdrawn,
            totalAdjustments,
            netFlow: totalCollected - totalRefunded - totalWithdrawn,
            totalRefundLiability: parseFloat(refundLiability[0]?.total ?? '0'),
            counts: {
                deposits: parseInt(deposits[0]?.count ?? '0', 10),
                refunds: parseInt(refunds[0]?.count ?? '0', 10),
                withdrawals: parseInt(withdrawals[0]?.count ?? '0', 10),
                adjustments: parseInt(adjustments[0]?.count ?? '0', 10),
            },
        };
    }
    async getPlatformWalletTransactions(page = 1, limit = 20, type, bookingId) {
        return this.platformWalletService.getTransactions(page, limit, type, bookingId);
    }
    async platformWalletWithdraw(amount, payoutMethod, payoutDetails, description, reference) {
        return this.platformWalletService.debit(amount, 'ADMIN_WITHDRAWAL', undefined, description || 'Admin withdrawal', reference, payoutMethod, payoutDetails);
    }
    async getWithdrawalRequests(status, page = 1, limit = 10) {
        const where = {};
        if (status)
            where.status = status;
        const skip = (page - 1) * limit;
        const [requests, total] = await Promise.all([
            this.prisma.withdrawalRequest.findMany({
                where,
                include: { owner: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.withdrawalRequest.count({ where }),
        ]);
        return {
            requests: requests.map((r) => this.formatWithdrawalRequest(r)),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async approveWithdrawalRequest(requestId, adminId, transactionRef) {
        const request = await this.prisma.withdrawalRequest.findUnique({
            where: { id: requestId },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('Withdrawal request not found');
        if (request.status === 'APPROVED')
            return this.formatWithdrawalRequest(request);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot approve request with status ${request.status}`);
        }
        const updated = await this.prisma.withdrawalRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED', processedBy: adminId, processedAt: new Date(), transactionRef },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });
        this.logger.log(`Withdrawal request ${requestId} approved by admin ${adminId}`);
        return this.formatWithdrawalRequest(updated);
    }
    async rejectWithdrawalRequest(requestId, adminId, adminNote) {
        const request = await this.prisma.withdrawalRequest.findUnique({
            where: { id: requestId },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('Withdrawal request not found');
        if (request.status === 'REJECTED')
            return this.formatWithdrawalRequest(request);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot reject request with status ${request.status}`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId: request.ownerId } });
            if (!wallet)
                throw new common_1.NotFoundException('Wallet not found');
            const balanceBefore = wallet.balance;
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore.toString())
                .plus(request.amount)
                .toDecimalPlaces(2);
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: client_1.WalletTransactionType.DEPOSIT,
                    amount: request.amount,
                    balanceBefore,
                    balanceAfter,
                    reference: requestId,
                    description: `Withdrawal request rejected - balance restored`,
                    metadata: { actorRole: 'OWNER', transactionPurpose: 'OWNER_WITHDRAWAL_REVERSAL' },
                },
            });
            return tx.withdrawalRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED', processedBy: adminId, processedAt: new Date(), adminNote },
                include: { owner: { select: { id: true, name: true, email: true } } },
            });
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
        this.logger.log(`Withdrawal request ${requestId} rejected by admin ${adminId}`);
        return this.formatWithdrawalRequest(updated);
    }
    formatWithdrawalRequest(r) {
        return {
            id: r.id,
            amount: parseFloat(r.amount.toString()),
            status: r.status,
            paymentMethod: r.paymentMethod,
            accountDetails: r.accountDetails,
            payoutId: r.transactionRef ?? null,
            rejectionReason: r.adminNote ?? null,
            processedAt: r.processedAt ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            ...(r.owner ? { owner: r.owner } : {}),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        platform_wallet_service_1.PlatformWalletService])
], AdminService);
//# sourceMappingURL=admin.service.js.map