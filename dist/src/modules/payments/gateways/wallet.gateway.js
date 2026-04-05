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
var WalletGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletGateway = void 0;
const common_1 = require("@nestjs/common");
const wallet_service_1 = require("../../wallet/wallet.service");
const client_1 = require("@prisma/client");
let WalletGateway = WalletGateway_1 = class WalletGateway {
    constructor(walletService) {
        this.walletService = walletService;
        this.logger = new common_1.Logger(WalletGateway_1.name);
    }
    async processPayment(request) {
        try {
            const existingPayment = await this.walletService['prisma'].payment.findUnique({
                where: { bookingId: request.bookingId },
            });
            if (existingPayment && existingPayment.status === 'COMPLETED') {
                this.logger.warn(`Attempted double payment for booking ${request.bookingId}`);
                return {
                    transactionId: existingPayment.transactionId || '',
                    status: 'FAILED',
                    gatewayResponse: {
                        error: 'Booking already paid',
                    },
                };
            }
            const wallet = await this.walletService.getWalletByUserId(request.userId);
            const currentBalance = Number(wallet.balance);
            const requiredAmount = request.amount;
            console.log('💰 === WALLET BALANCE CHECK ===');
            console.log('User ID:', request.userId);
            console.log('Current Balance:', currentBalance, 'EGP');
            console.log('Required Amount:', requiredAmount, 'EGP');
            console.log('Sufficient?', currentBalance >= requiredAmount ? '✅ YES' : '❌ NO');
            console.log('Difference:', (currentBalance - requiredAmount).toFixed(2), 'EGP');
            console.log('===============================');
            const hasSufficientBalance = await this.walletService.hasSufficientBalance(request.userId, request.amount);
            if (!hasSufficientBalance) {
                console.log('❌ PAYMENT FAILED: Insufficient wallet balance');
                console.log('   Balance:', currentBalance, 'EGP');
                console.log('   Required:', requiredAmount, 'EGP');
                console.log('   Shortage:', (requiredAmount - currentBalance).toFixed(2), 'EGP');
                return {
                    transactionId: '',
                    status: 'FAILED',
                    gatewayResponse: {
                        error: 'Insufficient wallet balance',
                        currentBalance: currentBalance,
                        requiredAmount: requiredAmount,
                        shortage: requiredAmount - currentBalance,
                    },
                };
            }
            console.log('✅ Balance check passed - proceeding with debit');
            const transaction = await this.walletService.debit(request.userId, request.amount, client_1.WalletTransactionType.BOOKING_PAYMENT, `Payment for booking ${request.bookingId}`, request.bookingId);
            this.logger.log(`Wallet payment processed: ${request.amount} ${request.currency} for booking ${request.bookingId}`);
            return {
                transactionId: transaction.id,
                status: 'SUCCESS',
                gatewayResponse: {
                    walletTransactionId: transaction.id,
                    balanceBefore: transaction.balanceBefore.toString(),
                    balanceAfter: transaction.balanceAfter.toString(),
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Wallet payment failed for booking ${request.bookingId}: ${errorMessage}`);
            return {
                transactionId: '',
                status: 'FAILED',
                gatewayResponse: {
                    error: errorMessage,
                },
            };
        }
    }
    async handleWebhook(_payload, _signature) {
        throw new common_1.BadRequestException('Wallet gateway does not support webhooks');
    }
    async refund(transactionId, amount) {
        try {
            const originalTransaction = await this.walletService['prisma'].walletTransaction.findUnique({
                where: { id: transactionId },
                include: { wallet: true },
            });
            if (!originalTransaction) {
                throw new common_1.BadRequestException('Original transaction not found');
            }
            const refundTransaction = await this.walletService.credit(originalTransaction.wallet.userId, amount, client_1.WalletTransactionType.REFUND, `Refund for transaction ${transactionId}`, transactionId);
            this.logger.log(`Wallet refund processed: ${amount} for transaction ${transactionId}`);
            return {
                refundId: refundTransaction.id,
                status: 'SUCCESS',
                amount,
                gatewayResponse: {
                    walletTransactionId: refundTransaction.id,
                    balanceBefore: refundTransaction.balanceBefore.toString(),
                    balanceAfter: refundTransaction.balanceAfter.toString(),
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Wallet refund failed for transaction ${transactionId}: ${errorMessage}`);
            return {
                refundId: '',
                status: 'FAILED',
                amount,
                gatewayResponse: {
                    error: errorMessage,
                },
            };
        }
    }
};
exports.WalletGateway = WalletGateway;
exports.WalletGateway = WalletGateway = WalletGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletGateway);
//# sourceMappingURL=wallet.gateway.js.map