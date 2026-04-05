import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';

/**
 * Resource types that can have ownership validation
 */
export enum ResourceType {
  FIELD = 'field',
  BOOKING = 'booking',
}

/**
 * Ownership validation configuration
 */
export interface OwnershipConfig {
  /** The type of resource to validate ownership for */
  resourceType: ResourceType;
  /** The parameter name in the route that contains the resource ID */
  paramName: string;
}

/**
 * Decorator to specify ownership validation requirements for a route
 * @param config - Configuration specifying the resource type and parameter name
 * @example
 * // Validate field ownership using 'id' parameter
 * @CheckOwnership({ resourceType: ResourceType.FIELD, paramName: 'id' })
 * 
 * // Validate booking ownership using 'bookingId' parameter
 * @CheckOwnership({ resourceType: ResourceType.BOOKING, paramName: 'bookingId' })
 */
export const CheckOwnership = (config: OwnershipConfig) =>
  SetMetadata(OWNERSHIP_KEY, config);
