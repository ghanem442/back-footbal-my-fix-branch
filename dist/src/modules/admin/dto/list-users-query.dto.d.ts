import { Role } from '@prisma/client';
export declare class ListUsersQueryDto {
    page?: number;
    limit?: number;
    email?: string;
    role?: Role;
    isVerified?: boolean;
    isSuspended?: boolean;
}
