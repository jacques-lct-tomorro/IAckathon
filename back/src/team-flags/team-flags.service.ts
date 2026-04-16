import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TeamFlagRow = {
  team: string;
  card_title: string;
  health_tier: string;
  subtitle: string;
  green_flags: string[];
  red_flags: string[];
  action_label: string;
};

type AnthropicMessageContent = {
  type?: string;
  text?: string;
};

@Injectable()
export class TeamFlagsService {
  constructor(private readonly config: ConfigService) {}

  private buildTeamFlagsPrompt(company: string, teams: unknown[]): string {
    return `
You are a B2B SaaS adoption analyst. You receive per-team facts derived from an org CSV (status, connections, budget holders). Your job is to turn facts into concise executive signals.

Company: ${company}

Teams JSON (ground truth — do not invent people or numbers not implied here):
${JSON.stringify(teams, null, 2)}

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "teams": [
    {
      "team": "<must exactly match a team string from the input>",
      "card_title": "<short title, e.g. Champion pocket / Adoption risk / Momentum team>",
      "health_tier": "<one of: strong | medium | risk | watchlist>",
      "subtitle": "<one line: reference coverage % and a concrete fact from the data>",
      "green_flags": ["<2-4 short bullets: real strengths tied to the metrics>"],
      "red_flags": ["<2-4 short bullets: credible risks tied to the metrics>"],
      "action_label": "<imperative next step a CSM could take this week, <= 8 words>"
    }
  ]
}

Rules:
- Emit one object per team in the input, same teams, no extras.
- Write flags as sharp, specific observations; avoid generic platitudes.
- If red_flags would be empty, still include 1 mild watch-item grounded in the data.
- health_tier must reflect adoption_ratio_among_relevant and engagement patterns: strong (~>=70 and healthy engagement), medium (~40-69 or mixed), risk (<40 or multiple inactive budget holders), watchlist (tiny team or mostly Not Relevant skew—explain in subtitle).
- action_label must logically follow the red_flags / green_flags balance.
`.trim();
  }

  private extractJsonObject(text: string): unknown {
    const trimmed = String(text || '').trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new InternalServerErrorException(
        'Model response did not contain a JSON object.',
      );
    }

    try {
      return JSON.parse(candidate.slice(start, end + 1)) as unknown;
    } catch {
      throw new InternalServerErrorException(
        'Unable to parse JSON from model response.',
      );
    }
  }

  private normalizeTeamFlagsPayload(
    payload: unknown,
    expectedTeams: string[],
  ): TeamFlagRow[] {
    const root = payload as { teams?: unknown[] };
    const teams = Array.isArray(root?.teams) ? root.teams : [];
    const byName = new Map(
      teams.map((entry) => {
        const row = entry as { team?: string };
        return [String(row.team || '').trim(), entry] as const;
      }),
    );

    return expectedTeams.map((teamName) => {
      const match = byName.get(teamName) || byName.get(teamName.trim());

      if (!match) {
        return {
          team: teamName,
          card_title: teamName,
          health_tier: 'watchlist',
          subtitle: 'No AI row matched this team name.',
          green_flags: [],
          red_flags: [
            'Regenerate insights — the model omitted structured data for this team.',
          ],
          action_label: 'Regenerate team insights',
        };
      }

      const row = match as {
        health_tier?: string;
        card_title?: string;
        subtitle?: string;
        green_flags?: unknown;
        red_flags?: unknown;
        action_label?: string;
      };

      const tier = ['strong', 'medium', 'risk', 'watchlist'].includes(
        String(row.health_tier),
      )
        ? String(row.health_tier)
        : 'medium';

      return {
        team: teamName,
        card_title: String(row.card_title || teamName).trim(),
        health_tier: tier,
        subtitle: String(row.subtitle || '').trim(),
        green_flags: (Array.isArray(row.green_flags) ? row.green_flags : [])
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 5),
        red_flags: (Array.isArray(row.red_flags) ? row.red_flags : [])
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 5),
        action_label: String(
          row.action_label || 'Follow up with team sponsor',
        ).trim(),
      };
    });
  }

  async generateTeamFlags(
    company: string,
    teamsInput: unknown[],
  ): Promise<TeamFlagRow[]> {
    const companyName = String(company || '').trim();
    if (!companyName) {
      throw new BadRequestException('company is required.');
    }

    if (!Array.isArray(teamsInput) || teamsInput.length === 0) {
      throw new BadRequestException('teams must be a non-empty array.');
    }

    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')?.trim();
    if (!apiKey) {
      throw new HttpException(
        'ANTHROPIC_API_KEY is not configured on the server.',
        503,
      );
    }

    const model =
      this.config.get<string>('ANTHROPIC_MODEL')?.trim() ||
      'claude-sonnet-4-20250514';

    const prompt = this.buildTeamFlagsPrompt(companyName, teamsInput);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2600,
        temperature: 0.25,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      const apiMessage =
        errorPayload?.error?.message ||
        `Anthropic API error ${response.status}`;
      throw new HttpException(apiMessage, response.status);
    }

    const payload = (await response.json()) as {
      content?: AnthropicMessageContent[];
    };

    const text =
      payload.content
        ?.map((item) => item.text)
        .join('\n')
        .trim() || '';

    const parsed = this.extractJsonObject(text);

    const expectedTeams = teamsInput.map((row) => {
      const teamRow = row as { team?: string };
      return String(teamRow.team || '').trim();
    });

    return this.normalizeTeamFlagsPayload(parsed, expectedTeams);
  }
}
