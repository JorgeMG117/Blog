export const missionConfig = {
  storageKey: "project_istanbul_progress",
  version: 2,
  codes: [
    { id: "bed", icon: "🛏️", label: "Bed Key", value: "1" },
    { id: "suitcase", icon: "🧳", label: "Suitcase Key", value: "2" },
    { id: "chest", icon: "👕", label: "Chest Key", value: "3" },
    { id: "flowers", icon: "💐", label: "Flowers Key", value: "4" },
    { id: "cream", icon: "🧴", label: "Cream Key", value: "5" },
  ],
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

export interface MissionCode {
  id: string;
  icon: string;
  label: string;
  value: string;
}

export interface MissionTriviaQuestion {
  prompt: string;
  placeholder: string;
  acceptedAnswers: string[];
  durationRange?: {
    minMinutes: number;
    maxMinutes: number;
  };
}

export interface MissionClueCopy {
  title: string;
  subtitle: string;
  icon: string;
}

export interface MissionRuntimeConfig {
  codes: MissionCode[];
  triviaQuestions: MissionTriviaQuestion[];
  voicePhrases: string[];
  history: {
    title: string;
    riddle: string;
    answer: string;
    placeholder: string;
  };
  extraction: {
    instruction: string;
    emphasis: string;
    masterKeyPrompt: string;
    masterKey: string;
  };
  final: {
    cipher: string[];
    caesarShift: number;
    displayWord: string;
    restaurantName: string;
    reservationTime: string;
    mapsUrl: string;
  };
  clueMeta: Record<ClueId | "extraction", MissionClueCopy>;
}

export type MissionForcedCompleted = Record<ClueId | "extraction", boolean>;

export interface MissionControlState {
  config: MissionRuntimeConfig;
  forcedCompleted: MissionForcedCompleted;
  progressVersion: number;
  updatedAt?: string;
}

export interface MissionProgress {
  version: number;
  roomUnlocked: boolean;
  completed: Record<ClueId, boolean>;
  overrideUsed: boolean;
  finalRevealed: boolean;
  soundEnabled: boolean;
}

export const defaultMissionRuntimeConfig: MissionRuntimeConfig = {
  codes: [...missionConfig.codes],
  triviaQuestions: [
    {
      prompt: "Near which major US city did Jorge study?",
      placeholder: "City",
      acceptedAnswers: ["Washington", "Washington DC", "Washington D.C.", "DC"],
    },
    {
      prompt: "In which Nintendo Switch game am I going to destroy you?",
      placeholder: "Game",
      acceptedAnswers: ["Mario Kart"],
    },
    {
      prompt: "Which is officially the worst country in the world?",
      placeholder: "Country",
      acceptedAnswers: ["Georgia"],
    },
    {
      prompt: "How many minutes was our longest videocall?",
      placeholder: "e.g. 5h15min",
      acceptedAnswers: [],
      durationRange: {
        minMinutes: 300,
        maxMinutes: 330,
      },
    },
    {
      prompt: "Could you tackle Jorge to the ground if he actually tried to stop you?",
      placeholder: "Yes / No",
      acceptedAnswers: ["No", "No way", "Of course not", "Impossible"],
    },
  ],
  voicePhrases: [
    "Mañaña",
    "Jorge es mucho mejor que yo a los videojuegos",
    "Quiero comer kebab",
    "Mmmmm como me gustan los ladyboys",
  ],
  history: {
    title: "THE SUNKEN PALACE",
    riddle:
      "Deep underground in Istanbul lies a sunken palace supported by 336 columns. Two of them rest on the head of a mythological creature placed upside down. What is the name of this creature?",
    answer: "Medusa",
    placeholder: "INPUT NAME",
  },
  extraction: {
    instruction: "LOOK INSIDE YOUR BAG RIGHT NOW.",
    emphasis: "FIND THE HEART.",
    masterKeyPrompt: "Enter the Master Key number found on the back of the heart:",
    masterKey: missionConfig.masterKey,
  },
  final: {
    cipher: [...missionConfig.cipher],
    caesarShift: 7,
    displayWord: "MÜRVER",
    restaurantName: "MÜRVER RESTAURANT",
    reservationTime: "20:45",
    mapsUrl: missionConfig.mapsUrl,
  },
  clueMeta: {
    trivia: {
      title: "CLUE 1: SECURITY TRIVIA",
      subtitle: "PERSONAL INTELLIGENCE CHECK",
      icon: "01",
    },
    voice: {
      title: "CLUE 2: VOICE RECOGNITION",
      subtitle: "SPANISH AUDIO VERIFICATION",
      icon: "02",
    },
    history: {
      title: "CLUE 3: ISTANBUL DOSSIER",
      subtitle: "HISTORICAL INTELLIGENCE",
      icon: "03",
    },
    extraction: {
      title: "MASTER KEY EXTRACTION",
      subtitle: "PHYSICAL ASSET REQUIRED",
      icon: "⚠",
    },
  },
};

export const defaultForcedCompleted: MissionForcedCompleted = {
  trivia: false,
  voice: false,
  history: false,
  extraction: false,
};

export const defaultMissionControlState: MissionControlState = {
  config: defaultMissionRuntimeConfig,
  forcedCompleted: defaultForcedCompleted,
  progressVersion: missionConfig.version,
};

export function createInitialProgress(version: number = missionConfig.version): MissionProgress {
  return {
    version,
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
}

export const initialProgress: MissionProgress = createInitialProgress();

export function parseProgress(
  raw: string | null,
  version: number = missionConfig.version,
): MissionProgress {
  const fallback = createInitialProgress(version);
  if (!raw) return fallback;

  try {
    const value = JSON.parse(raw) as Partial<MissionProgress>;
    if (value.version !== version) return fallback;

    return {
      version,
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
    return fallback;
  }
}

export function mergeMissionControlState(
  value: Partial<MissionControlState> | null | undefined,
): MissionControlState {
  return {
    config: {
      ...defaultMissionRuntimeConfig,
      ...(value?.config ?? {}),
      codes: value?.config?.codes ?? defaultMissionRuntimeConfig.codes,
      triviaQuestions:
        value?.config?.triviaQuestions ?? defaultMissionRuntimeConfig.triviaQuestions,
      voicePhrases: value?.config?.voicePhrases ?? defaultMissionRuntimeConfig.voicePhrases,
      history: {
        ...defaultMissionRuntimeConfig.history,
        ...(value?.config?.history ?? {}),
      },
      extraction: {
        ...defaultMissionRuntimeConfig.extraction,
        ...(value?.config?.extraction ?? {}),
      },
      final: {
        ...defaultMissionRuntimeConfig.final,
        ...(value?.config?.final ?? {}),
      },
      clueMeta: {
        ...defaultMissionRuntimeConfig.clueMeta,
        ...(value?.config?.clueMeta ?? {}),
      },
    },
    forcedCompleted: {
      ...defaultForcedCompleted,
      ...(value?.forcedCompleted ?? {}),
    },
    progressVersion: value?.progressVersion ?? missionConfig.version,
    updatedAt: value?.updatedAt,
  };
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

export interface VoicePhraseMatch {
  score: number;
  isMatch: boolean;
}

export function matchVoicePhrase(
  transcript: string,
  target: string,
): VoicePhraseMatch {
  const normalizedTranscript = normalizeText(transcript);
  const normalizedTarget = normalizeText(target);
  const score = similarity(normalizedTranscript, normalizedTarget);

  if (!normalizedTranscript || !normalizedTarget) {
    return { score, isMatch: false };
  }

  const transcriptWords = normalizedTranscript.split(" ");
  const targetWords = normalizedTarget.split(" ");
  const allowedWordDifference = Math.max(1, Math.floor(targetWords.length * 0.2));
  const wordCountIsClose =
    Math.abs(transcriptWords.length - targetWords.length) <= allowedWordDifference;
  const significantWords = targetWords.filter(
    (word) => word.length >= 4 && new Set(word).size > 1,
  );
  const transcriptCandidates = transcriptWords.flatMap((word, index) => [
    word,
    index < transcriptWords.length - 1
      ? `${word}${transcriptWords[index + 1]}`
      : word,
  ]);
  const matchedSignificantWords = significantWords.filter((targetWord) =>
    transcriptCandidates.some((word) => similarity(word, targetWord) >= 0.8),
  ).length;
  const significantWordCoverage = significantWords.length
    ? matchedSignificantWords / significantWords.length
    : 1;

  return {
    score,
    isMatch:
      score >= 0.84 &&
      wordCountIsClose &&
      significantWordCoverage >= 0.75,
  };
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

export function caesarDecrypt(value: string, shift: number): string {
  return value
    .split("")
    .map((character) => {
      const index = character.charCodeAt(0) - 65;
      return String.fromCharCode(((index - shift + 26) % 26) + 65);
    })
    .join("");
}
