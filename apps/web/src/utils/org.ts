import {
  STATUS_CLASS,
  STATUS_ORDER,
  STATUS_SORT_ORDER,
  TEAM_DISPLAY_LABELS,
} from "../constants";
import type {
  OrgStructure,
  Person,
  PersonNode,
  Status,
  TeamMetricsPayloadEntry,
} from "../types";

export function normalizeTeamSlug(rawTeam: string): string {
  let value = String(rawTeam || "")
    .trim()
    .toLowerCase();
  if (!value) {
    return "";
  }

  if (value.startsWith("user.team.")) {
    value = value.slice("user.team.".length);
  } else if (value.startsWith("user.team_")) {
    value = value.slice("user.team_".length);
  } else if (value.startsWith("user_team_")) {
    value = value.slice("user_team_".length);
  }

  return value.replace(/\./g, "_");
}

export function mapTeamDisplayName(rawTeam: string): string {
  const raw = String(rawTeam || "").trim();
  if (!raw) {
    return "";
  }

  const slug = normalizeTeamSlug(raw);
  if (slug && TEAM_DISPLAY_LABELS[slug]) {
    return TEAM_DISPLAY_LABELS[slug];
  }

  return raw;
}

export function normalizeStatus(rawStatus: string): Status {
  const value = String(rawStatus || "")
    .trim()
    .toLowerCase();

  if (value === "active") {
    return "Active";
  }

  if (
    value === "inactive" ||
    value === "created account but inactive" ||
    value === "created_account_but_inactive"
  ) {
    return "Inactive";
  }

  if (value === "to invite" || value === "to_invite" || value === "invite") {
    return "To Invite";
  }

  if (
    value === "not relevant" ||
    value === "not_relevant" ||
    value === "irrelevant" ||
    value === "grey"
  ) {
    return "Inactive";
  }

  return "Inactive";
}

export function getStatusClass(status: Status): string {
  return STATUS_CLASS[status] || "inactive";
}

export function getDepartmentBadgeClass(ratio: number): string {
  if (ratio >= 0.7) {
    return "good";
  }

  if (ratio >= 0.4) {
    return "mid";
  }

  return "low";
}

export function isLeadershipCandidate(person: Person): boolean {
  const title = String(person.role || "")
    .trim()
    .toLowerCase();
  const team = normalizeTeamSlug(person.team);

  if (team === "general_management" || team === "executive") {
    return true;
  }

  return /(ceo|chief|founder|co-founder|president|vp|head|director|directeur|directrice|lead|manager|general counsel|cfo|coo|cto|dsi)/i.test(
    title,
  );
}

export function isTeamAdmin(person: Person): boolean {
  return (
    String(person.accessRole || "")
      .trim()
      .toLowerCase() === "admin"
  );
}

export function isTeamManager(person: Person): boolean {
  return (
    String(person.accessRole || "")
      .trim()
      .toLowerCase() === "manager"
  );
}

function compareByStatusThenName(left: Person, right: Person): number {
  const statusDiff =
    (STATUS_SORT_ORDER[left.status] ?? 99) - (STATUS_SORT_ORDER[right.status] ?? 99);
  return statusDiff !== 0 ? statusDiff : left.name.localeCompare(right.name);
}

export function buildDepartmentGroups(records: Person[]): OrgStructure {
  const managerNames = new Set(records.map((person) => person.name));
  const hasManagerData = records.some(
    (person) =>
      person.managerName &&
      managerNames.has(person.managerName) &&
      person.managerName !== person.name,
  );

  let leaders: Person[];

  if (hasManagerData) {
    leaders = records.filter(
      (person) =>
        (!person.managerName ||
          !managerNames.has(person.managerName) ||
          person.managerName === person.name) &&
        isLeadershipCandidate(person),
    );
  } else {
    const execTeamLeaders = records.filter(
      (person) =>
        ["general_management", "executive"].includes(normalizeTeamSlug(person.team)) &&
        isLeadershipCandidate(person),
    );

    const inferredLeaders = execTeamLeaders.length
      ? execTeamLeaders
      : records.filter(isLeadershipCandidate);

    leaders = inferredLeaders.length ? inferredLeaders : records.slice(0, 1);
  }

  const leadersInTopBar = leaders.filter((person) => {
    const hasTeam = Boolean(String(person.team || "").trim());

    if (hasTeam && (isTeamAdmin(person) || isTeamManager(person))) {
      return false;
    }

    return true;
  });

  const topBarLeaderIds = new Set(leadersInTopBar.map((person) => person.id));
  const teamMap = new Map<string, Person[]>();

  records
    .filter((person) => !topBarLeaderIds.has(person.id))
    .forEach((person) => {
      const teamName = person.team || "No team";

      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, []);
      }

      teamMap.get(teamName)?.push(person);
    });

  const departments = [...teamMap.entries()]
    .map(([team, everyone]) => {
      const admins = everyone.filter(isTeamAdmin).sort(compareByStatusThenName);
      const managers = everyone
        .filter((person) => isTeamManager(person) && !isTeamAdmin(person))
        .sort(compareByStatusThenName);
      const users = everyone
        .filter((person) => !isTeamAdmin(person) && !isTeamManager(person))
        .sort(compareByStatusThenName);
      const relevantMembers = everyone;
      const coveredMembers = relevantMembers.filter(
        (person) => person.status === "Active" || person.status === "Inactive",
      );
      const ratio = relevantMembers.length
        ? coveredMembers.length / relevantMembers.length
        : 0;

      return {
        team,
        admins,
        managers,
        users,
        ratio,
      };
    })
    .sort((left, right) => left.team.localeCompare(right.team));

  return {
    leaders: leadersInTopBar.sort(compareByStatusThenName),
    departments,
  };
}

export function formatAccessRoleForTooltip(person: Person): string | null {
  if (isTeamAdmin(person)) {
    return "Admin";
  }

  if (isTeamManager(person)) {
    return "Manager";
  }

  const raw = String(person.accessRole || "").trim();
  return raw || null;
}

export function buildTree(records: Person[]): PersonNode[] {
  const nodesByName = new Map<string, PersonNode>();

  records.forEach((person) => {
    nodesByName.set(person.name, {
      ...person,
      children: [],
    });
  });

  const roots: PersonNode[] = [];

  records.forEach((person) => {
    const node = nodesByName.get(person.name);
    if (!node) {
      return;
    }
    const manager = nodesByName.get(person.managerName);

    if (manager && manager.name !== person.name) {
      manager.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (node: PersonNode): void => {
    node.children.sort((left, right) => left.name.localeCompare(right.name));
    node.children.forEach(sortTree);
  };

  roots.sort((left, right) => left.name.localeCompare(right.name));
  roots.forEach(sortTree);

  return roots;
}

export function collectStatusCounts(records: Person[]): Record<Status, number> {
  const counts: Record<Status, number> = {
    Active: 0,
    Inactive: 0,
    "To Invite": 0,
  };

  records.forEach((person) => {
    counts[person.status] += 1;
  });

  return STATUS_ORDER.reduce((acc, status) => {
    acc[status] = counts[status];
    return acc;
  }, counts);
}

export function computeCoverage(records: Person[]): {
  ratio: number;
  coveredUsers: number;
  relevantUsers: number;
} {
  const relevantUsers = records;
  const coveredUsers = relevantUsers.filter(
    (person) => person.status === "Active" || person.status === "Inactive",
  );

  const ratio = relevantUsers.length
    ? (coveredUsers.length / relevantUsers.length) * 100
    : 0;

  return {
    ratio,
    coveredUsers: coveredUsers.length,
    relevantUsers: relevantUsers.length,
  };
}

export function buildTeamMetricsPayload(
  company: string,
  records: Person[],
): TeamMetricsPayloadEntry[] {
  const structure = buildDepartmentGroups(records);

  return structure.departments.map((department) => {
    const members = [
      ...(department.admins || []),
      ...(department.managers || []),
      ...(department.users || []),
    ];
    const counts = collectStatusCounts(members);
    const relevantMembers = members;
    const activeMembers = members.filter((person) => person.status === "Active");
    const inactiveBudgetHolders = members.filter(
      (person) => person.budgetHolder && person.status === "Inactive",
    );
    const avgConnections = members.length
      ? (
          members.reduce((sum, person) => sum + person.connectionsLastMonth, 0) /
          members.length
        ).toFixed(1)
      : "0.0";

    const memberLines = [...members]
      .sort(
        (left, right) => left.connectionsLastMonth - right.connectionsLastMonth,
      )
      .slice(0, 12)
      .map(
        (person) =>
          `- ${person.name} | ${person.role || "No role"} | ${person.status} | connections_last_month=${person.connectionsLastMonth} | budget_holder=${person.budgetHolder ? "yes" : "no"}`,
      )
      .join("\n");

    return {
      company,
      team: department.team,
      headcount: members.length,
      adoption_ratio_among_relevant: Math.round(department.ratio * 100),
      status_counts: counts,
      active_count: activeMembers.length,
      relevant_count: relevantMembers.length,
      avg_connections_last_month: avgConnections,
      inactive_budget_holders: inactiveBudgetHolders.map((person) => person.name),
      member_sample_lowest_engagement_first: memberLines || "- none",
    };
  });
}
