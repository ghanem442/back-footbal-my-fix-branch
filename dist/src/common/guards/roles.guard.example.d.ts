export declare class ExampleController {
    getPlayerData(): {
        message: string;
    };
    createField(): {
        message: string;
    };
    getAdminData(): {
        message: string;
    };
    getOwnerOrAdminData(): {
        message: string;
    };
    getAuthenticatedData(): {
        message: string;
    };
}
export declare class Example2Controller {
    adminOnlyEndpoint(): {
        message: string;
    };
    publicEndpoint(): {
        message: string;
    };
}
export declare class Example3Controller {
    getCurrentUser(user: JwtPayload): {
        userId: string;
        email: string;
        role: "PLAYER" | "FIELD_OWNER" | "ADMIN";
    };
}
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
