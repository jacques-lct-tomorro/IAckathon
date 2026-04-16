import { API_BASE } from "../constants.js";
import {
  buildDepartmentGroups,
  buildTeamMetricsPayload,
} from "./org.js";

export async function generateTeamFlags(
  company,
  records,
  signal,
  onUnauthorized,
  onTeam,
) {
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
    const rawMessage = err?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage;
    throw new Error(message || `Backend error ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Unable to read team insights stream.");
  }

  const reader = response.body.getReader();
  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  if (signal) {
    if (signal.aborted) {
      reader.cancel().catch(() => {});
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onAbort);
  }

  const decoder = new TextDecoder();
  let carry = "";
  const collected = [];
  let sawDone = false;

  function parseSseEventBlock(block) {
    const lines = block.split("\n").map((l) => l.replace(/\r$/, ""));
    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const jsonStr = line.replace(/^data:\s?/, "").trim();
      if (!jsonStr) {
        continue;
      }
      let evt;
      try {
        evt = JSON.parse(jsonStr);
      } catch {
        continue;
      }
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
    throw new Error(
      "Connection closed before any team insights were received.",
    );
  }

  return collected;
}
