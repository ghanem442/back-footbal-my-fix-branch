import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
export declare class UsersController {
    private readonly usersService;
    private readonly logger;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            phoneNumber: string | null;
            preferredLanguage: string;
            isVerified: boolean;
            createdAt: Date;
        };
    }>;
    updateMe(req: any, body: {
        name?: string;
        phoneNumber?: string;
        preferredLanguage?: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            phoneNumber: string | null;
            preferredLanguage: string;
            isVerified: boolean;
            createdAt: Date;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateUserRole(id: string, updateUserRoleDto: UpdateUserRoleDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            userId: string;
            email: string;
            oldRole: import(".prisma/client").$Enums.Role;
            newRole: import(".prisma/client").$Enums.Role;
            updatedAt: Date;
        };
    }>;
}
