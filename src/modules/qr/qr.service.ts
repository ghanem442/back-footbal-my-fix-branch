import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Generate a unique QR token for a booking
   */
  private generateQrToken(bookingId: string): string {
    // Create a unique token combining booking ID and UUID
    return `${bookingId}-${uuidv4()}`;
  }

  /**
   * Generate QR code image as base64
   */
  private async generateQrCodeImage(qrToken: string): Promise<Buffer> {
    try {
      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(qrToken, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 1,
      });

      return qrBuffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate QR code image: ${errorMessage}`);
      throw new Error('Failed to generate QR code image');
    }
  }

  /**
   * Generate QR code for a booking
   * Creates QR token, generates image, uploads to storage, and stores in database
   */
  async generateQrCodeForBooking(bookingId: string): Promise<{
    id: string;
    qrToken: string;
    imageUrl: string;
  }> {
    this.logger.log(`Generating QR code for booking: ${bookingId}`);

    // Generate unique QR token
    const qrToken = this.generateQrToken(bookingId);

    // Generate QR code image
    const qrImageBuffer = await this.generateQrCodeImage(qrToken);

    // Upload to storage provider
    const filename = `qr-codes/${bookingId}.png`;
    const imageUrl = await this.storage.upload(
      qrImageBuffer,
      filename,
      'image/png',
    );

    // Store QR code record in database
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

  /**
   * Get QR code by booking ID
   */
  async getQrCodeByBookingId(bookingId: string) {
    return this.prisma.qrCode.findUnique({
      where: { bookingId },
    });
  }

  /**
   * Get QR code by token
   */
  async getQrCodeByToken(qrToken: string) {
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

  /**
   * Mark QR code as used
   */
  async markQrCodeAsUsed(qrToken: string): Promise<void> {
    await this.prisma.qrCode.update({
      where: { qrToken },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }
}
