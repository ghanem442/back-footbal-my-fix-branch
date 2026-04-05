import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
export declare class AuthExampleController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            role: any;
        };
    }>;
    refresh(refreshDto: {
        refreshToken: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private validateUser;
    private getUserById;
}
export declare class ProfileExampleController {
    getProfile(user: JwtPayload): {
        userId: string;
        email: string;
        role: "PLAYER" | "FIELD_OWNER" | "ADMIN";
    };
    getDetailedProfile(user: JwtPayload): {
        userId: string;
        email: string;
        role: "PLAYER" | "FIELD_OWNER" | "ADMIN";
        message: string;
    };
}
export declare class AdminExampleController {
    getDashboard(user: JwtPayload): {
        message: string;
    };
}
export declare class FieldsExampleController {
    listFields(): {
        message: string;
    };
    createField(user: JwtPayload, fieldDto: any): {
        message: string;
        ownerId: string;
    };
}
