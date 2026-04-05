import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto';
import { I18nService } from '../i18n/i18n.service';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly i18n;
    constructor(notificationsService: NotificationsService, i18n: I18nService);
    registerDevice(userId: string, dto: RegisterDeviceDto): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
    }>;
    unregisterDevice(dto: UnregisterDeviceDto): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
    }>;
}
