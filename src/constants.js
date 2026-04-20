import teamDisplayLabels from "./data/team-display-labels.json";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const STATUS_CONFIG = {
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

export const STATUS_SORT_ORDER = { Active: 0, Inactive: 1, "To Invite": 2 };

export const STATUS_ORDER = ["Active", "Inactive", "To Invite"];

export const STATUS_CLASS = {
  Active: "active",
  Inactive: "inactive",
  "To Invite": "invite",
};

/** Slug-style team keys from `team-display-labels.json` → labels in the UI */
export const TEAM_DISPLAY_LABELS = Object.freeze(teamDisplayLabels);

export const TEAM_TIER_LABELS = {
  strong: "Strong",
  medium: "Medium",
  risk: "At risk",
  watchlist: "Watchlist",
};

export const TEAM_TIER_SORT_ORDER = {
  risk: 0,
  watchlist: 1,
  medium: 2,
  strong: 3,
};
