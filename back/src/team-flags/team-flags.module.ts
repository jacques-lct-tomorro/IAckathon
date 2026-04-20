import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamFlagsController } from './team-flags.controller';
import { TeamFlagsService } from './team-flags.service';

@Module({
  imports: [AuthModule],
  controllers: [TeamFlagsController],
  providers: [TeamFlagsService],
})
export class TeamFlagsModule {}
