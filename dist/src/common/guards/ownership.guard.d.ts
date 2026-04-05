import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@modules/prisma/prisma.service';
export declare class OwnershipGuard implements CanActivate {
    private reflector;
    private prisma;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private validateOwnership;
    private validateFieldOwnership;
    private validateBookingOwnership;
}
