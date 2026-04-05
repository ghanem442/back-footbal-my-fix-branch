import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payment Response DTO
 * 
 * Data transfer object for payment operation responses.
 */
export class PaymentResponseDto {
  @ApiProperty({
    description: 'Transaction ID from the payment gateway',
    example: 'txn_1234567890',
  })
  transactionId!: string;

  @ApiProperty({
    description: 'Payment status',
    enum: ['SUCCESS', 'PENDING', 'FAILED'],
    example: 'SUCCESS',
  })
  status!: 'SUCCESS' | 'PENDING' | 'FAILED';

  @ApiProperty({
    description: 'Raw response from the payment gateway',
    example: { charge_id: 'ch_123', receipt_url: 'https://...' },
  })
  gatewayResponse!: any;

  @ApiPropertyOptional({
    description: 'Redirect URL for completing payment (if required)',
    example: 'https://payment-gateway.com/checkout/session_123',
  })
  redirectUrl?: string;
}

/**
 * Refund Response DTO
 * 
 * Data transfer object for refund operation responses.
 */
export class RefundResponseDto {
  @ApiProperty({
    description: 'Refund ID from the payment gateway',
    example: 'refund_1234567890',
  })
  refundId!: string;

  @ApiProperty({
    description: 'Refund status',
    enum: ['SUCCESS', 'PENDING', 'FAILED'],
    example: 'SUCCESS',
  })
  status!: 'SUCCESS' | 'PENDING' | 'FAILED';

  @ApiProperty({
    description: 'Refunded amount',
    example: 200.00,
  })
  amount!: number;

  @ApiProperty({
    description: 'Raw response from the payment gateway',
    example: { refund_id: 'ref_123', status: 'succeeded' },
  })
  gatewayResponse!: any;
}
