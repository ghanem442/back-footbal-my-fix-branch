import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number; // in seconds
}

export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(THROTTLE_KEY, options);

// Predefined throttle configurations
export const ThrottleAuth = () => Throttle({ limit: 5, ttl: 900 }); // 5 per 15 minutes
export const ThrottlePayment = () => Throttle({ limit: 10, ttl: 3600 }); // 10 per hour
export const ThrottleDefault = () => Throttle({ limit: 100, ttl: 900 }); // 100 per 15 minutes
