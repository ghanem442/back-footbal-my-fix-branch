import { PrismaService } from '../prisma/prisma.service';
export declare class BookingsCronService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    expireUnpaidBookings(): Promise<void>;
    expireNoShowBookings(): Promise<void>;
}
