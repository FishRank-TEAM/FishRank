import { IsIn } from 'class-validator';

export class OrganizerStatusDto {
  @IsIn(['upcoming', 'active', 'closed', 'finished'])
  status: 'upcoming' | 'active' | 'closed' | 'finished';
}
