"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const QRCode = __importStar(require("qrcode"));
const uuid_1 = require("uuid");
let QrService = QrService_1 = class QrService {
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
        this.logger = new common_1.Logger(QrService_1.name);
    }
    generateQrToken(bookingId) {
        return `${bookingId}-${(0, uuid_1.v4)()}`;
    }
    async generateQrCodeImage(qrToken) {
        try {
            const qrBuffer = await QRCode.toBuffer(qrToken, {
                errorCorrectionLevel: 'H',
                type: 'png',
                width: 300,
                margin: 1,
            });
            return qrBuffer;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to generate QR code image: ${errorMessage}`);
            throw new Error('Failed to generate QR code image');
        }
    }
    async generateQrCodeForBooking(bookingId) {
        this.logger.log(`Generating QR code for booking: ${bookingId}`);
        const qrToken = this.generateQrToken(bookingId);
        const qrImageBuffer = await this.generateQrCodeImage(qrToken);
        const filename = `qr-codes/${bookingId}.png`;
        const imageUrl = await this.storage.upload(qrImageBuffer, filename, 'image/png');
        const qrCode = await this.prisma.qrCode.create({
            data: {
                bookingId,
                qrToken,
                imageUrl,
            },
        });
        this.logger.log(`QR code generated successfully for booking: ${bookingId}`);
        return {
            id: qrCode.id,
            qrToken: qrCode.qrToken,
            imageUrl: qrCode.imageUrl,
        };
    }
    async getQrCodeByBookingId(bookingId) {
        return this.prisma.qrCode.findUnique({
            where: { bookingId },
        });
    }
    async getQrCodeByToken(qrToken) {
        return this.prisma.qrCode.findUnique({
            where: { qrToken },
            include: {
                booking: {
                    include: {
                        field: true,
                        player: true,
                        timeSlot: true,
                    },
                },
            },
        });
    }
    async markQrCodeAsUsed(qrToken) {
        await this.prisma.qrCode.update({
            where: { qrToken },
            data: {
                isUsed: true,
                usedAt: new Date(),
            },
        });
    }
};
exports.QrService = QrService;
exports.QrService = QrService = QrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], QrService);
//# sourceMappingURL=qr.service.js.map