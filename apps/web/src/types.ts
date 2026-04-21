export type Status = "Active" | "Inactive" | "To Invite";

export interface Person {
  id: string;
  company: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  team: string;
  accessRole: string;
  managerName: string;
  status: Status;
  budgetHolder: boolean;
  connectionsLastMonth: number;
  lastConnectedAt: string;
}

export type PersonNode = Person & {
  children: PersonNode[];
};

export interface Department {
  team: string;
  admins: Person[];
  managers: Person[];
  users: Person[];
  ratio: number;
}

export interface OrgStructure {
  leaders: Person[];
  departments: Department[];
}

export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
}

export type HealthTier = "strong" | "medium" | "risk" | "watchlist";

export interface TeamFlag {
  team: string;
  card_title: string;
  subtitle?: string;
  health_tier: HealthTier;
  green_flags: string[];
  red_flags: string[];
  action_label: string;
}

export interface TeamMetricsPayloadEntry {
  company: string;
  team: string;
  headcount: number;
  adoption_ratio_among_relevant: number;
  status_counts: Record<Status, number>;
  active_count: number;
  relevant_count: number;
  avg_connections_last_month: string;
  inactive_budget_holders: string[];
  member_sample_lowest_engagement_first: string;
}
