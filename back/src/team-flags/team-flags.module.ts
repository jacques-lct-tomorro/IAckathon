import { Module } from '@nestjs/common';
import { TeamFlagsController } from './team-flags.controller';
import { TeamFlagsService } from './team-flags.service';

@Module({
  controllers: [TeamFlagsController],
  providers: [TeamFlagsService],
})
export class TeamFlagsModule {}
