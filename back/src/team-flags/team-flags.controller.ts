import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
  async generateTeamFlags(
    @Body() body: TeamFlagsRequestBody,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    this.teamFlagsService.assertTeamFlagsInputs(body.company, body.teams);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const row of this.teamFlagsService.generateTeamFlagsStream(
        body.company,
        body.teams,
      )) {
        res.write(`data: ${JSON.stringify({ type: 'team', data: row })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
