import teamDisplayLabels from "./data/team-display-labels.json";
import type { HealthTier, Status } from "./types";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; badge: string }
> = {
  Active: {
    label: "Active user",
    color: "#20b15a",
    badge: "Green",
  },
  Inactive: {
    label: "Created account but inactive",
    color: "#f08b2d",
    badge: "Orange",
  },
  "To Invite": {
    label: "Whitespace",
    color: "#d32f2f",
    badge: "Red",
  },
};

export const STATUS_SORT_ORDER: Record<Status, number> = {
  Active: 0,
  Inactive: 1,
  "To Invite": 2,
};

export const STATUS_ORDER: readonly Status[] = ["Active", "Inactive", "To Invite"];

export const STATUS_CLASS: Record<Status, string> = {
  Active: "active",
  Inactive: "inactive",
  "To Invite": "invite",
};

/** Slug-style team keys from `team-display-labels.json` → labels in the UI */
export const TEAM_DISPLAY_LABELS: Readonly<Record<string, string>> =
  Object.freeze(teamDisplayLabels);

export const TEAM_TIER_LABELS: Record<HealthTier, string> = {
  strong: "Strong",
  medium: "Medium",
  risk: "At risk",
  watchlist: "Watchlist",
};

export const TEAM_TIER_SORT_ORDER: Record<HealthTier, number> = {
  risk: 0,
  watchlist: 1,
  medium: 2,
  strong: 3,
};
