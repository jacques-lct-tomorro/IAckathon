import { API_BASE } from "../constants";
import type { Person, TeamFlag } from "../types";
import { buildDepartmentGroups, buildTeamMetricsPayload } from "./org";

type TeamEvent = { type: "team"; data: TeamFlag };
type ErrorEvent = { type: "error"; message?: string };
type DoneEvent = { type: "done" };
type SseEvent = TeamEvent | ErrorEvent | DoneEvent;

function isSseEvent(value: unknown): value is SseEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<SseEvent>;
  return event.type === "team" || event.type === "error" || event.type === "done";
}

export async function generateTeamFlags(
  company: string,
  records: Person[],
  signal?: AbortSignal,
  onUnauthorized?: () => void,
  onTeam?: (team: TeamFlag) => void,
): Promise<TeamFlag[]> {
  const structure = buildDepartmentGroups(records);

  if (!structure.departments.length) {
    throw new Error("No teams found under leadership in this dataset.");
  }

  const teams = buildTeamMetricsPayload(company, records);
  const response = await fetch(`${API_BASE}/api/team-flags`, {
    method: "POST",
    signal,
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ company, teams }),
  });

  if (response.status === 401) {
    onUnauthorized?.();
    throw new Error("Please sign in again.");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    const rawMessage = (err as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;
    throw new Error(message || `Backend error ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Unable to read team insights stream.");
  }

  const reader = response.body.getReader();
  const onAbort = (): void => {
    void reader.cancel().catch(() => {});
  };
  if (signal) {
    if (signal.aborted) {
      void reader.cancel().catch(() => {});
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onAbort);
  }

  const decoder = new TextDecoder();
  let carry = "";
  const collected: TeamFlag[] = [];
  let sawDone = false;

  function parseSseEventBlock(block: string): void {
    const lines = block.split("\n").map((line) => line.replace(/\r$/, ""));
    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const jsonStr = line.replace(/^data:\s?/, "").trim();
      if (!jsonStr) {
        continue;
      }
      let evtRaw: unknown;
      try {
        evtRaw = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      if (!isSseEvent(evtRaw)) {
        continue;
      }
      const evt = evtRaw;
      if (evt.type === "team" && evt.data) {
        collected.push(evt.data);
        onTeam?.(evt.data);
      } else if (evt.type === "error") {
        throw new Error(evt.message || "Stream error");
      } else if (evt.type === "done") {
        sawDone = true;
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      carry += decoder.decode(value || new Uint8Array(), { stream: !done });

      const events = carry.split("\n\n");
      carry = events.pop() ?? "";

      for (const rawEvent of events) {
        parseSseEventBlock(rawEvent);
      }

      if (done) {
        break;
      }
    }

    if (carry.trim()) {
      parseSseEventBlock(carry);
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  if (!sawDone && collected.length === 0) {
    throw new Error("Connection closed before any team insights were received.");
  }

  return collected;
}
