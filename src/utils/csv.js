import { mapTeamDisplayName, normalizeStatus } from "./org.js";

export function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

export function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseLastConnectedAt(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return null;
  }

  const directDate = new Date(value);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const normalized = value
    .replace(/^janvier/i, "January")
    .replace(/^fevrier/i, "February")
    .replace(/^février/i, "February")
    .replace(/^mars/i, "March")
    .replace(/^avril/i, "April")
    .replace(/^mai/i, "May")
    .replace(/^juin/i, "June")
    .replace(/^juillet/i, "July")
    .replace(/^aout/i, "August")
    .replace(/^août/i, "August")
    .replace(/^septembre/i, "September")
    .replace(/^octobre/i, "October")
    .replace(/^novembre/i, "November")
    .replace(/^decembre/i, "December")
    .replace(/^décembre/i, "December");

  const normalizedDate = new Date(normalized);
  return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
}

export function alignRowValues(headers, values) {
  if (values.length === headers.length) {
    return values;
  }

  if (
    values.length === headers.length - 1 &&
    String(values[0] || "").includes("@")
  ) {
    return ["", ...values];
  }

  if (values.length > headers.length) {
    const overflow = values.length - headers.length;
    const mergedFirstColumn = values.slice(0, overflow + 1).join(", ");
    return [mergedFirstColumn, ...values.slice(overflow + 1)];
  }

  return [
    ...values,
    ...Array.from({ length: headers.length - values.length }, () => ""),
  ];
}

export function deriveStatus(rawRecord, lastConnectedAt) {
  const explicitStatus = rawRecord.status || rawRecord.statue;

  if (explicitStatus) {
    return normalizeStatus(explicitStatus);
  }

  const role = String(
    rawRecord.dim_user_user_role ||
      rawRecord.access_role ||
      rawRecord.user_role ||
      rawRecord.role ||
      "",
  )
    .trim()
    .toLowerCase();

  if (!role) {
    return "To Invite";
  }

  if (!lastConnectedAt) {
    return "Inactive";
  }

  const now = new Date();
  const daysSinceLastConnection =
    (now.getTime() - lastConnectedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastConnection <= 30) {
    return "Active";
  }

  return "Inactive";
}

export function parseCsv(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => toSlug(header));

  return lines.slice(1).map((line, rowIndex) => {
    const values = alignRowValues(headers, splitCsvLine(line));
    const rawRecord = headers.reduce((record, header, columnIndex) => {
      record[header] = values[columnIndex] || "";
      return record;
    }, {});

    const lastConnectedAt = parseLastConnectedAt(
      rawRecord.last_connected_at || rawRecord.last_connection_at,
    );
    const status = deriveStatus(rawRecord, lastConnectedAt);
    const displayName =
      rawRecord.dim_user_user_full_name ||
      rawRecord.full_name ||
      rawRecord.name ||
      rawRecord.dim_user_user_email ||
      rawRecord.email ||
      "Unknown user";
    const email = rawRecord.dim_user_user_email || rawRecord.email || "";
    const role =
      rawRecord.dim_user_user_job_title ||
      rawRecord.job_title ||
      rawRecord.role ||
      rawRecord.title ||
      "";
    const rawTeam =
      rawRecord.dim_user_user_team ||
      rawRecord.team ||
      rawRecord.department ||
      "";
    const team = mapTeamDisplayName(rawTeam);
    const company =
      rawRecord.dim_user_user_organization_name ||
      rawRecord.organization_name ||
      rawRecord.organization ||
      rawRecord.company ||
      "Unknown Company";
    const accessRole =
      rawRecord.dim_user_user_role ||
      rawRecord.access_role ||
      rawRecord.user_role ||
      rawRecord.role ||
      "";

    return {
      id: `${toSlug(company)}-${toSlug(email || displayName)}-${rowIndex}`,
      company,
      name: displayName,
      initials:
        rawRecord.initials ||
        displayName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      email,
      role,
      team,
      accessRole,
      managerName: rawRecord.manager_name || rawRecord.manager || "",
      status,
      budgetHolder: ["true", "yes", "y", "1", "budget holder"].includes(
        String(
          rawRecord.budget_holder ||
            rawRecord.budgetholder ||
            rawRecord.is_budget_holder ||
            "",
        )
          .trim()
          .toLowerCase(),
      ),
      connectionsLastMonth:
        Number.parseInt(
          rawRecord.number_of_connexion_last_month ||
            rawRecord.number_of_connections_last_month ||
            rawRecord.connections_last_month ||
            rawRecord.number_in_connexion_in_last_month ||
            (status === "Active" ? "1" : "0"),
          10,
        ) || 0,
      lastConnectedAt: rawRecord.last_connected_at || "",
    };
  });
}
