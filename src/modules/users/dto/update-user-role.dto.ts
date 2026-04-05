import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'User role to assign',
    enum: Role,
    example: Role.FIELD_OWNER,
  })
  @IsNotEmpty()
  @IsEnum(Role, {
    message: 'Role must be one of: PLAYER, FIELD_OWNER, ADMIN',
  })
  role!: Role;
}
