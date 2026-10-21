import { IsIn } from 'class-validator';

export class ReviewDayCodeClaimDto {
  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
