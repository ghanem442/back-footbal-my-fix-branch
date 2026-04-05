import { IsString, IsIn } from 'class-validator';

export class UpdateFieldStatusDto {
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'HIDDEN', 'DISABLED', 'PENDING_APPROVAL', 'REJECTED'])
  status!: string;
}
