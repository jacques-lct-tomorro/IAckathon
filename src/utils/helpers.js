export function initialsFromUsername(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "—";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0][0] || "";
    const second = parts[1][0] || "";
    const pair = `${first}${second}`.toUpperCase();
    return pair || trimmed.slice(0, 2).toUpperCase();
  }

  return trimmed.slice(0, 1).toUpperCase();
}
