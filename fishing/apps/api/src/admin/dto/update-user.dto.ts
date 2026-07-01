import { IsIn, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: 'user' | 'admin';

  /** active = 복구, suspended = 정지(soft delete) */
  @IsOptional()
  @IsIn(['active', 'suspended'])
  accountStatus?: 'active' | 'suspended';
}
