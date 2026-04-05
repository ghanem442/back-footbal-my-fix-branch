import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cancellation policy configuration
 */
export interface CancellationPolicy {
  thresholdMaxH: number; // Hours threshold for maximum refund (default: 3)
  thresholdMinH: number; // Hours threshold for minimum refund (default: 0)
  refundMaxPercent: number; // Refund percentage for >max threshold (default: 100)
  refundMinPercent: number; // Refund percentage for min-max threshold (default: 0)
  refund0Percent: number; // Refund percentage for <min threshold (default: 0)
}

/**
 * Refund calculation result
 */
export interface RefundCalculation {
  refundPercentage: number;
  refundAmount: number;
  hoursUntilBooking: number;
  appliedThreshold: string;
}

@Injectable()
export class CancellationPolicyService {
  private readonly logger = new Logger(CancellationPolicyService.name);

  // Default policy values
  // Original requirement: 3 hours threshold
  // - Cancel >3 hours before: 100% refund
  // - Cancel <3 hours before: 0% refund
  private readonly DEFAULT_POLICY: CancellationPolicy = {
    thresholdMaxH: 3,  // Maximum threshold (changed from 24 to 3 hours)
    thresholdMinH: 0,  // Minimum threshold (changed from 12 to 0 - no middle tier)
    refundMaxPercent: 100,  // Maximum refund percentage
    refundMinPercent: 0,  // Minimum refund percentage (changed from 50 to 0 - no middle tier)
    refund0Percent: 0,
  };

  // AppSettings keys for policy configuration
  private readonly POLICY_KEYS = {
    THRESHOLD_MAX_H: 'cancellation_threshold_maxh',
    THRESHOLD_MIN_H: 'cancellation_threshold_minh',
    REFUND_MAX: 'cancellation_refund_max_percent',
    REFUND_MIN: 'cancellation_refund_min_percent',
    REFUND_0: 'cancellation_refund_0_percent',
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load cancellation policy from AppSettings table
   * Falls back to default values if settings are not configured
   */
  async loadPolicy(): Promise<CancellationPolicy> {
    try {
      const settings = await this.prisma.appSetting.findMany({
        where: {
          key: {
            in: Object.values(this.POLICY_KEYS),
          },
        },
      });

      const settingsMap = new Map(
        settings.map((s) => [s.key, parseFloat(s.value)]),
      );

      const policy: CancellationPolicy = {
        thresholdMaxH:
          settingsMap.get(this.POLICY_KEYS.THRESHOLD_MAX_H) ??
          this.DEFAULT_POLICY.thresholdMaxH,
        thresholdMinH:
          settingsMap.get(this.POLICY_KEYS.THRESHOLD_MIN_H) ??
          this.DEFAULT_POLICY.thresholdMinH,
        refundMaxPercent:
          settingsMap.get(this.POLICY_KEYS.REFUND_MAX) ??
          this.DEFAULT_POLICY.refundMaxPercent,
        refundMinPercent:
          settingsMap.get(this.POLICY_KEYS.REFUND_MIN) ??
          this.DEFAULT_POLICY.refundMinPercent,
        refund0Percent:
          settingsMap.get(this.POLICY_KEYS.REFUND_0) ??
          this.DEFAULT_POLICY.refund0Percent,
      };

      this.logger.log('Loaded cancellation policy from database', policy);
      return policy;
    } catch (error) {
      this.logger.warn(
        'Failed to load cancellation policy from database, using defaults',
        error,
      );
      return this.DEFAULT_POLICY;
    }
  }

  /**
   * Calculate refund amount based on time until booking and cancellation policy
   * @param bookingAmount - Total booking amount
   * @param scheduledDateTime - Scheduled date and time of the booking
   * @param cancellationTime - Time of cancellation (defaults to now)
   * @returns Refund calculation details
   */
  async calculateRefund(
    bookingAmount: number,
    scheduledDateTime: Date,
    cancellationTime: Date = new Date(),
  ): Promise<RefundCalculation> {
    // Load policy from database
    const policy = await this.loadPolicy();

    // Calculate hours until booking
    const millisecondsUntilBooking =
      scheduledDateTime.getTime() - cancellationTime.getTime();
    const hoursUntilBooking = millisecondsUntilBooking / (1000 * 60 * 60);

    // Determine refund percentage based on policy thresholds
    let refundPercentage: number;
    let appliedThreshold: string;

    if (hoursUntilBooking > policy.thresholdMaxH) {
      // More than max threshold (e.g., 3 hours) - maximum refund
      refundPercentage = policy.refundMaxPercent;
      appliedThreshold = `>${policy.thresholdMaxH}h`;
    } else if (hoursUntilBooking > policy.thresholdMinH) {
      // Between min-max thresholds - minimum refund
      refundPercentage = policy.refundMinPercent;
      appliedThreshold = `${policy.thresholdMinH}h-${policy.thresholdMaxH}h`;
    } else {
      // Less than min threshold - 0% refund
      refundPercentage = policy.refund0Percent;
      appliedThreshold = `<${policy.thresholdMinH}h`;
    }

    // Calculate refund amount
    const refundAmount = (bookingAmount * refundPercentage) / 100;

    const result: RefundCalculation = {
      refundPercentage,
      refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
      hoursUntilBooking: Math.round(hoursUntilBooking * 100) / 100,
      appliedThreshold,
    };

    this.logger.log(
      `Refund calculation: ${hoursUntilBooking.toFixed(2)}h until booking, ${refundPercentage}% refund = ${result.refundAmount}`,
    );

    return result;
  }

  /**
   * Calculate refund for field owner cancellation (always 100%)
   * @param bookingAmount - Total booking amount
   * @returns Refund calculation details
   */
  calculateFieldOwnerCancellationRefund(
    bookingAmount: number,
  ): RefundCalculation {
    const refundAmount = bookingAmount;

    this.logger.log(
      `Field owner cancellation: 100% refund = ${refundAmount}`,
    );

    return {
      refundPercentage: 100,
      refundAmount: Math.round(refundAmount * 100) / 100,
      hoursUntilBooking: 0, // Not applicable for field owner cancellation
      appliedThreshold: 'field_owner_cancellation',
    };
  }

  /**
   * Get the default cancellation policy
   */
  getDefaultPolicy(): CancellationPolicy {
    return { ...this.DEFAULT_POLICY };
  }

  /**
   * Get policy setting keys (for admin configuration)
   */
  getPolicyKeys() {
    return { ...this.POLICY_KEYS };
  }
}
