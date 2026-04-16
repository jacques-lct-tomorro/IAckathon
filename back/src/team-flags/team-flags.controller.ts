import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { TeamFlagsService } from './team-flags.service';

export type TeamFlagsRequestBody = {
  company: string;
  teams: unknown[];
};

@Controller('team-flags')
@UseGuards(AuthGuard)
export class TeamFlagsController {
  constructor(private readonly teamFlagsService: TeamFlagsService) {}

  @Post()
  async generateTeamFlags(@Body() body: TeamFlagsRequestBody) {
    const teams = await this.teamFlagsService.generateTeamFlags(
      body.company,
      body.teams,
    );
    return { teams };
  }
}
