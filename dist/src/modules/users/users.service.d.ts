import { PrismaService } from '@modules/prisma/prisma.service';
import { RedisService } from '@modules/redis/redis.service';
import { User, Role } from '@prisma/client';
export declare class UsersService {
    private prisma;
    private redisService;
    private readonly SALT_ROUNDS;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService);
    createUser(email: string, password: string, role?: Role, name?: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    updateProfile(userId: string, data: {
        name?: string;
        phoneNumber?: string;
        preferredLanguage?: string;
    }): Promise<User>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    hashPassword(password: string): Promise<string>;
    markAsVerified(userId: string): Promise<User>;
    changeUserRole(userId: string, newRole: Role, adminUserId: string): Promise<{
        user: User;
        oldRole: Role;
        newRole: Role;
    }>;
    private invalidateAllUserTokens;
    updatePassword(userId: string, newPassword: string): Promise<void>;
}
