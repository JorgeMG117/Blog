export const missionConfig = {
  date: "2026-08-11",
  timeZone: "Europe/Istanbul",
  storageKey: "project_istanbul_progress",
  version: 1,
  codes: [
    { id: "gaming", icon: "🎮", label: "Gaming Key", value: "1" },
    { id: "reflection", icon: "🪞", label: "Reflection Key", value: "2" },
    { id: "heart", icon: "❤️", label: "Heart Key", value: "3" },
    { id: "coffee", icon: "☕", label: "Coffee Key", value: "4" },
    { id: "travel", icon: "✈️", label: "Travel Key", value: "5" },
  ],
  schedule: {
    trivia: "14:00",
    voice: "17:00",
    history: "18:30",
    extraction: "19:30",
  },
  cipher: ["T", "B", "Y", "C", "L", "Y"],
  masterKey: "7",
  mapsUrl: "https://share.google/3P6ALoyLLFC7lZZEZ",
} as const;

export type ClueId = "trivia" | "voice" | "history";
export type MissionScreen =
  | "access"
  | "dashboard"
  | ClueId
  | "extraction"
  | "success";

export interface MissionProgress {
  version: number;
  roomUnlocked: boolean;
  completed: Record<ClueId, boolean>;
  overrideUsed: boolean;
  finalRevealed: boolean;
  soundEnabled: boolean;
}

export const initialProgress: MissionProgress = {
  version: missionConfig.version,
  roomUnlocked: false,
  completed: {
    trivia: false,
    voice: false,
    history: false,
  },
  overrideUsed: false,
  finalRevealed: false,
  soundEnabled: true,
};

export function parseProgress(raw: string | null): MissionProgress {
  if (!raw) return initialProgress;

  try {
    const value = JSON.parse(raw) as Partial<MissionProgress>;
    if (value.version !== missionConfig.version) return initialProgress;

    return {
      version: missionConfig.version,
      roomUnlocked: value.roomUnlocked === true,
      completed: {
        trivia: value.completed?.trivia === true,
        voice: value.completed?.voice === true,
        history: value.completed?.history === true,
      },
      overrideUsed: value.overrideUsed === true,
      finalRevealed: value.finalRevealed === true,
      soundEnabled: value.soundEnabled !== false,
    };
  } catch {
    return initialProgress;
  }
}

export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);

  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }

  return previous[right.length];
}

export function similarity(left: string, right: string): number {
  const a = normalizeText(left);
  const b = normalizeText(right);
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - editDistance(a, b) / longest;
}

export function matchesAny(
  answer: string,
  accepted: readonly string[],
  threshold = 0.8,
): boolean {
  const normalized = normalizeText(answer);
  if (!normalized) return false;
  return accepted.some(
    (candidate) =>
      normalized === normalizeText(candidate) ||
      similarity(normalized, candidate) >= threshold,
  );
}

export function parseDurationMinutes(value: string): number | null {
  const normalized = normalizeText(value);
  const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hora)/);
  const minuteMatch = normalized.match(/(\d+)\s*(?:m|min|minuto)/);

  if (hourMatch) {
    const hours = Number(hourMatch[1].replace(",", "."));
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    return Math.round(hours * 60 + minutes);
  }

  const compact = normalized.match(/^(\d{1,2})\s*h?\s*(\d{2})$/);
  if (compact && value.toLocaleLowerCase().includes("h")) {
    return Number(compact[1]) * 60 + Number(compact[2]);
  }

  const number = normalized.match(/^\d+$/);
  return number ? Number(number[0]) : null;
}

function istanbulDateTime(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: missionConfig.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function isTimeReached(time: string, now = new Date()): boolean {
  const current = istanbulDateTime(now);
  if (current.date < missionConfig.date) return false;
  if (current.date > missionConfig.date) return true;

  const [hours, minutes] = time.split(":").map(Number);
  return current.minutes >= hours * 60 + minutes;
}

export function countdownTo(time: string, now = new Date()): string {
  if (isTimeReached(time, now)) return "AVAILABLE";

  const event = new Date(`${missionConfig.date}T${time}:00+03:00`);
  const seconds = Math.max(0, Math.floor((event.getTime() - now.getTime()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (days > 0) return `${days}D ${hours}H ${minutes}M`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function caesarDecrypt(value: string, shift: number): string {
  return value
    .split("")
    .map((character) => {
      const index = character.charCodeAt(0) - 65;
      return String.fromCharCode(((index - shift + 26) % 26) + 65);
    })
    .join("");
}
