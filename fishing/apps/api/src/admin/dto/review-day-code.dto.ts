import { IsIn } from 'class-validator';

export class ReviewDayCodeDto {
  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
