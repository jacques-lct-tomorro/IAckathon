import { Body, Controller, Post } from '@nestjs/common';
import { TeamFlagsService } from './team-flags.service';

export type TeamFlagsRequestBody = {
  company: string;
  teams: unknown[];
};

@Controller('team-flags')
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
