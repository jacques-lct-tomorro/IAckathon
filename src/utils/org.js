import {
  STATUS_CLASS,
  STATUS_ORDER,
  TEAM_DISPLAY_LABELS,
} from "../constants.js";

export function normalizeTeamSlug(rawTeam) {
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

export function mapTeamDisplayName(rawTeam) {
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

export function normalizeStatus(rawStatus) {
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

export function getStatusClass(status) {
  return STATUS_CLASS[status] || "inactive";
}

export function getDepartmentBadgeClass(ratio) {
  if (ratio >= 0.7) {
    return "good";
  }

  if (ratio >= 0.4) {
    return "mid";
  }

  return "low";
}

export function isLeadershipCandidate(person) {
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

export function isTeamAdmin(person) {
  return (
    String(person.accessRole || "")
      .trim()
      .toLowerCase() === "admin"
  );
}

export function isTeamManager(person) {
  return (
    String(person.accessRole || "")
      .trim()
      .toLowerCase() === "manager"
  );
}

export function buildDepartmentGroups(records) {
  const managerNames = new Set(records.map((person) => person.name));
  const hasManagerData = records.some(
    (person) =>
      person.managerName &&
      managerNames.has(person.managerName) &&
      person.managerName !== person.name,
  );

  let leaders;

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
        ["general_management", "executive"].includes(
          normalizeTeamSlug(person.team),
        ) && isLeadershipCandidate(person),
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
  const teamMap = new Map();

  records
    .filter((person) => !topBarLeaderIds.has(person.id))
    .forEach((person) => {
      const teamName = person.team || "No team";

      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, []);
      }

      teamMap.get(teamName).push(person);
    });

  const departments = [...teamMap.entries()]
    .map(([team, everyone]) => {
      const admins = everyone
        .filter(isTeamAdmin)
        .sort((left, right) => left.name.localeCompare(right.name));
      const managers = everyone
        .filter((person) => isTeamManager(person) && !isTeamAdmin(person))
        .sort((left, right) => left.name.localeCompare(right.name));
      const users = everyone
        .filter((person) => !isTeamAdmin(person) && !isTeamManager(person))
        .sort((left, right) => left.name.localeCompare(right.name));
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
    leaders: leadersInTopBar.sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    departments,
  };
}

export function formatAccessRoleForTooltip(person) {
  if (isTeamAdmin(person)) {
    return "Admin";
  }

  if (isTeamManager(person)) {
    return "Manager";
  }

  const raw = String(person.accessRole || "").trim();
  return raw || null;
}

export function buildTree(records) {
  const nodesByName = new Map();

  records.forEach((person) => {
    nodesByName.set(person.name, {
      ...person,
      children: [],
    });
  });

  const roots = [];

  records.forEach((person) => {
    const node = nodesByName.get(person.name);
    const manager = nodesByName.get(person.managerName);

    if (manager && manager.name !== person.name) {
      manager.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (node) => {
    node.children.sort((left, right) => left.name.localeCompare(right.name));
    node.children.forEach(sortTree);
  };

  roots.sort((left, right) => left.name.localeCompare(right.name));
  roots.forEach(sortTree);

  return roots;
}

export function collectStatusCounts(records) {
  return STATUS_ORDER.reduce((counts, status) => {
    counts[status] = records.filter(
      (person) => person.status === status,
    ).length;
    return counts;
  }, {});
}

export function computeCoverage(records) {
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

export function buildTeamMetricsPayload(company, records) {
  const structure = buildDepartmentGroups(records);

  return structure.departments.map((department) => {
    const members = [
      ...(department.admins || []),
      ...(department.managers || []),
      ...(department.users || []),
    ];
    const counts = collectStatusCounts(members);
    const relevantMembers = members;
    const activeMembers = members.filter(
      (person) => person.status === "Active",
    );
    const inactiveBudgetHolders = members.filter(
      (person) => person.budgetHolder && person.status === "Inactive",
    );
    const avgConnections = members.length
      ? (
          members.reduce(
            (sum, person) => sum + person.connectionsLastMonth,
            0,
          ) / members.length
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
      inactive_budget_holders: inactiveBudgetHolders.map(
        (person) => person.name,
      ),
      member_sample_lowest_engagement_first: memberLines || "- none",
    };
  });
}
