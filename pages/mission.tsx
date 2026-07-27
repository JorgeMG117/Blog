import Head from "next/head";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  caesarDecrypt,
  ClueId,
  countdownTo,
  initialProgress,
  isTimeReached,
  matchesAny,
  missionConfig,
  MissionProgress,
  MissionScreen,
  parseDurationMinutes,
  parseProgress,
  similarity,
} from "../lib/mission";

interface SpeechRecognitionResultLike {
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly results: { readonly 0: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const triviaQuestions = [
  {
    prompt: "Near which major US city did Jorge study?",
    placeholder: "City",
    validate: (value: string) =>
      matchesAny(value, ["Washington", "Washington DC", "Washington D.C.", "DC"]),
  },
  {
    prompt: "In which Nintendo Switch game am I going to destroy you?",
    placeholder: "Game",
    validate: (value: string) => matchesAny(value, ["Mario Kart"]),
  },
  {
    prompt: "Which is officially the worst country in the world?",
    placeholder: "Country",
    validate: (value: string) => matchesAny(value, ["Georgia"]),
  },
  {
    prompt: "How many minutes was our longest videocall?",
    placeholder: "e.g. 5h15min",
    validate: (value: string) => {
      const minutes = parseDurationMinutes(value);
      return minutes !== null && minutes >= 300 && minutes <= 330;
    },
  },
  {
    prompt: "Could you tackle Jorge to the ground if he actually tried to stop you?",
    placeholder: "Yes / No",
    validate: (value: string) =>
      matchesAny(value, ["No", "No way", "Of course not", "Impossible"]),
  },
] as const;

const voicePhrases = [
  "Mañana",
  "Jorge es mucho mejor que yo a los videojuegos",
  "Quiero comer kebab",
] as const;

const clueMeta: Record<
  ClueId | "extraction",
  { title: string; subtitle: string; time: string; icon: string }
> = {
  trivia: {
    title: "CLUE 1: SECURITY TRIVIA",
    subtitle: "PERSONAL INTELLIGENCE CHECK",
    time: missionConfig.schedule.trivia,
    icon: "01",
  },
  voice: {
    title: "CLUE 2: VOICE RECOGNITION",
    subtitle: "SPANISH AUDIO VERIFICATION",
    time: missionConfig.schedule.voice,
    icon: "02",
  },
  history: {
    title: "CLUE 3: ISTANBUL DOSSIER",
    subtitle: "HISTORICAL INTELLIGENCE",
    time: missionConfig.schedule.history,
    icon: "03",
  },
  extraction: {
    title: "MASTER KEY EXTRACTION",
    subtitle: "PHYSICAL ASSET REQUIRED",
    time: missionConfig.schedule.extraction,
    icon: "⚠",
  },
};

function tone(kind: "click" | "error" | "success", enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequencies = { click: 520, error: 140, success: 880 };
  oscillator.type = kind === "error" ? "sawtooth" : "sine";
  oscillator.frequency.value = frequencies[kind];
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + (kind === "success" ? 0.35 : 0.14),
  );
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (kind === "success" ? 0.35 : 0.14));
  oscillator.onended = () => void context.close();
}

function ScreenHeader({
  code,
  title,
  onBack,
}: {
  code: string;
  title: string;
  onBack?: () => void;
}) {
  return (
    <header className="mission-header">
      {onBack && (
        <button className="back-button" onClick={onBack} aria-label="Back to dashboard">
          ← HUB
        </button>
      )}
      <div>
        <span className="eyebrow">[ PROJECT ISTANBUL / {code} ]</span>
        <h1>{title}</h1>
      </div>
      <span className="status-dot">● LIVE</span>
    </header>
  );
}

export default function MissionPage() {
  const [progress, setProgress] = useState<MissionProgress>(initialProgress);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<MissionScreen>("access");
  const [now, setNow] = useState(() => new Date());
  const [accessCodes, setAccessCodes] = useState(
    missionConfig.codes.map(() => ""),
  );
  const [accessError, setAccessError] = useState(false);
  const [answers, setAnswers] = useState(triviaQuestions.map(() => ""));
  const [answerErrors, setAnswerErrors] = useState<boolean[]>(
    triviaQuestions.map(() => false),
  );
  const [historyAnswer, setHistoryAnswer] = useState("");
  const [historyError, setHistoryError] = useState(false);
  const [masterKey, setMasterKey] = useState("");
  const [masterError, setMasterError] = useState(false);
  const [overrideClicks, setOverrideClicks] = useState<number[]>([]);
  const [revealedLetters, setRevealedLetters] = useState(0);

  useEffect(() => {
    const stored = parseProgress(localStorage.getItem(missionConfig.storageKey));
    setProgress(stored);
    setScreen(stored.finalRevealed ? "success" : stored.roomUnlocked ? "dashboard" : "access");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(missionConfig.storageKey, JSON.stringify(progress));
  }, [hydrated, progress]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("mission-root");
    document.body.classList.add("mission-body");
    return () => {
      document.documentElement.classList.remove("mission-root");
      document.body.classList.remove("mission-body");
    };
  }, []);

  useEffect(() => {
    if (screen !== "success") return;
    setRevealedLetters(0);
    const timer = window.setInterval(() => {
      setRevealedLetters((current) => {
        if (current >= missionConfig.cipher.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 260);
    return () => window.clearInterval(timer);
  }, [screen]);

  const completeClue = useCallback(
    (clue: ClueId) => {
      setProgress((current) => ({
        ...current,
        completed: { ...current.completed, [clue]: true },
      }));
      tone("success", progress.soundEnabled);
      window.setTimeout(() => setScreen("dashboard"), 750);
    },
    [progress.soundEnabled],
  );

  const availability = useMemo(() => {
    const trivia = isTimeReached(missionConfig.schedule.trivia, now);
    const voice =
      isTimeReached(missionConfig.schedule.voice, now) &&
      progress.completed.trivia;
    const history =
      isTimeReached(missionConfig.schedule.history, now) &&
      progress.completed.voice;
    const extraction =
      isTimeReached(missionConfig.schedule.extraction, now) &&
      progress.completed.history;
    return { trivia, voice, history, extraction };
  }, [now, progress.completed]);

  const decrypted = caesarDecrypt(missionConfig.cipher.join(""), 7);
  const finalWord = `${decrypted[0]}Ü${decrypted.slice(2)}`;

  const submitAccess = (event: React.FormEvent) => {
    event.preventDefault();
    const valid = accessCodes.every(
      (code, index) => code === missionConfig.codes[index].value,
    );
    if (!valid) {
      setAccessError(true);
      tone("error", progress.soundEnabled);
      navigator.vibrate?.(180);
      window.setTimeout(() => setAccessError(false), 1000);
      return;
    }
    tone("success", progress.soundEnabled);
    setProgress((current) => ({ ...current, roomUnlocked: true }));
    window.setTimeout(() => setScreen("dashboard"), 450);
  };

  const submitTrivia = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = answers.map(
      (answer, index) => !triviaQuestions[index].validate(answer),
    );
    setAnswerErrors(errors);
    if (errors.some(Boolean)) {
      tone("error", progress.soundEnabled);
      navigator.vibrate?.(120);
      return;
    }
    completeClue("trivia");
  };

  const submitHistory = (event: React.FormEvent) => {
    event.preventDefault();
    if (!matchesAny(historyAnswer, ["Medusa"], 0.8)) {
      setHistoryError(true);
      tone("error", progress.soundEnabled);
      return;
    }
    setHistoryError(false);
    completeClue("history");
  };

  const submitMasterKey = (event: React.FormEvent) => {
    event.preventDefault();
    if (masterKey.trim() !== missionConfig.masterKey) {
      setMasterError(true);
      tone("error", progress.soundEnabled);
      navigator.vibrate?.([100, 60, 100]);
      return;
    }
    setMasterError(false);
    tone("success", progress.soundEnabled);
    setProgress((current) => ({ ...current, finalRevealed: true }));
    setScreen("success");
  };

  const handleOverride = () => {
    const timestamp = Date.now();
    const recent = [...overrideClicks.filter((click) => timestamp - click < 2000), timestamp];
    if (recent.length >= 3) {
      setProgress((current) => ({
        ...current,
        roomUnlocked: true,
        completed: { trivia: true, voice: true, history: true },
        overrideUsed: true,
      }));
      setScreen("dashboard");
      setOverrideClicks([]);
      tone("success", progress.soundEnabled);
      return;
    }
    setOverrideClicks(recent);
  };

  if (!hydrated) {
    return <div className="mission-loading">INITIALIZING SECURE CHANNEL...</div>;
  }

  return (
    <>
      <Head>
        <title>Project Istanbul — Restricted Access</title>
        <meta
          name="description"
          content="Classified mission control interface."
        />
        <meta name="theme-color" content="#0b0f19" />
      </Head>

      <main className={`mission-shell ${accessError ? "access-error" : ""}`}>
        <div className="grid-overlay" aria-hidden="true" />
        <button
          className="sound-toggle"
          onClick={() =>
            setProgress((current) => ({
              ...current,
              soundEnabled: !current.soundEnabled,
            }))
          }
          aria-label={progress.soundEnabled ? "Mute sounds" : "Enable sounds"}
        >
          {progress.soundEnabled ? "SOUND: ON" : "SOUND: OFF"}
        </button>

        {screen === "access" && (
          <section className="screen access-screen">
            <div className="classification">TOP SECRET // EYES ONLY</div>
            <p className="eyebrow">[ RESTRICTED ACCESS ]</p>
            <h1 className="hero-title">PROJECT<br /><span>ISTANBUL</span></h1>
            <p className="hero-copy">
              Enter the 5 location keys hidden in the room to initialize the
              decryption system.
            </p>
            <form onSubmit={submitAccess} className="code-grid">
              {missionConfig.codes.map((code, index) => (
                <label className="code-field" key={code.id}>
                  <span className="code-icon">{code.icon}</span>
                  <span>{code.label}</span>
                  <input
                    value={accessCodes[index]}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, "").slice(0, 2);
                      setAccessCodes((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? value : item,
                        ),
                      );
                    }}
                    inputMode="numeric"
                    aria-label={code.label}
                    placeholder="—"
                    maxLength={2}
                  />
                </label>
              ))}
              <button
                className="primary-button"
                disabled={accessCodes.some((code) => !code)}
                type="submit"
              >
                INITIALIZE DECRYPTION <span>→</span>
              </button>
            </form>
            <div className="error-slot" role="alert">
              {accessError && "INVALID KEYS. SEARCH THE ROOM AGAIN."}
            </div>
          </section>
        )}

        {screen === "dashboard" && (
          <Dashboard
            progress={progress}
            availability={availability}
            now={now}
            onOpen={(target) => {
              tone("click", progress.soundEnabled);
              setScreen(target);
            }}
          />
        )}

        {screen === "trivia" && (
          <section className="screen">
            <ScreenHeader code="CLUE 01" title="SECURITY TRIVIA" onBack={() => setScreen("dashboard")} />
            <div className="panel">
              <p className="panel-kicker">IDENTITY VERIFICATION // FIVE DATA POINTS</p>
              <form onSubmit={submitTrivia} className="trivia-form">
                {triviaQuestions.map((question, index) => (
                  <label key={question.prompt} className={answerErrors[index] ? "invalid" : ""}>
                    <span><b>0{index + 1}</b>{question.prompt}</span>
                    <input
                      value={answers[index]}
                      onChange={(event) =>
                        setAnswers((current) =>
                          current.map((answer, answerIndex) =>
                            answerIndex === index ? event.target.value : answer,
                          ),
                        )
                      }
                      placeholder={question.placeholder}
                    />
                    {answerErrors[index] && <em>DATA MISMATCH</em>}
                  </label>
                ))}
                <button className="primary-button" type="submit">SUBMIT ANSWERS →</button>
              </form>
            </div>
          </section>
        )}

        {screen === "voice" && (
          <VoiceScreen
            soundEnabled={progress.soundEnabled}
            onBack={() => setScreen("dashboard")}
            onComplete={() => completeClue("voice")}
          />
        )}

        {screen === "history" && (
          <section className="screen">
            <ScreenHeader code="CLUE 03" title="ISTANBUL DOSSIER" onBack={() => setScreen("dashboard")} />
            <div className="dossier panel">
              <div className="dossier-stamp">ARCHIVE<br />532 A.D.</div>
              <p className="panel-kicker">CLASSIFIED HISTORICAL RECORD</p>
              <h2>THE SUNKEN PALACE</h2>
              <p className="riddle">
                “Deep underground in Istanbul lies a sunken palace supported by
                336 columns. Two of them rest on the head of a mythological
                creature placed upside down. What is the name of this creature?”
              </p>
              <form onSubmit={submitHistory}>
                <label className={historyError ? "invalid single-answer" : "single-answer"}>
                  <span>SUBJECT IDENTIFICATION</span>
                  <input
                    value={historyAnswer}
                    onChange={(event) => setHistoryAnswer(event.target.value)}
                    placeholder="INPUT NAME"
                  />
                  {historyError && <em>IDENTIFICATION FAILED</em>}
                </label>
                <button className="primary-button" type="submit">VERIFY DOSSIER →</button>
              </form>
            </div>
          </section>
        )}

        {screen === "extraction" && (
          <section className="screen extraction-screen">
            <ScreenHeader code="FINAL PHASE" title="MASTER KEY EXTRACTION" onBack={() => setScreen("dashboard")} />
            <div className="extraction-pulse">!</div>
            <h2>MASTER KEY REQUIRED</h2>
            <p>The digital system cannot complete the decryption. The Master Key is physical.</p>
            <div className="physical-order">
              LOOK INSIDE YOUR BAG RIGHT NOW.<br />
              <strong>FIND THE HANDMADE ARTIFACT.</strong>
            </div>
            <form onSubmit={submitMasterKey} className="master-form">
              <label>
                Enter the Master Key number found on the back of the heart:
                <input
                  value={masterKey}
                  onChange={(event) => setMasterKey(event.target.value.replace(/\D/g, "").slice(0, 2))}
                  inputMode="numeric"
                  placeholder="#"
                  aria-label="Master Key"
                />
              </label>
              {masterError && <span role="alert">INVALID MASTER KEY</span>}
              <button className="gold-button" type="submit">DECRYPT FINAL LOCATION</button>
            </form>
          </section>
        )}

        {screen === "success" && (
          <section className="screen success-screen">
            <div className="confetti" aria-hidden="true">
              {Array.from({ length: 30 }, (_, index) => (
                <i key={index} style={{ "--i": index } as React.CSSProperties} />
              ))}
            </div>
            <p className="eyebrow">[ DECRYPTION COMPLETE ]</p>
            <div className="final-code" aria-label={finalWord}>
              {finalWord.split("").map((letter, index) => (
                <span key={`${letter}-${index}`}>
                  {index < revealedLetters
                    ? letter
                    : missionConfig.cipher[index]}
                </span>
              ))}
            </div>
            <div className="success-line" />
            <p className="unlocked-label">LOCATION UNLOCKED</p>
            <h1>MÜRVER RESTAURANT</h1>
            <div className="reservation">
              <span>RESERVATION TIME</span>
              <strong>20:45</strong>
            </div>
            <a
              className="gold-button map-button"
              href={missionConfig.mapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              OPEN SECURE COORDINATES ↗
            </a>
            <p className="final-message">See you at dinner, my girlfriend.</p>
          </section>
        )}

        <button
          className="secret-override"
          onClick={handleOverride}
          aria-label="Emergency mission override"
        />
      </main>
      <MissionStyles />
    </>
  );
}

function Dashboard({
  progress,
  availability,
  now,
  onOpen,
}: {
  progress: MissionProgress;
  availability: Record<ClueId | "extraction", boolean>;
  now: Date;
  onOpen: (screen: MissionScreen) => void;
}) {
  const segments = [
    progress.completed.trivia ? ["T", "B"] : ["_", "_"],
    progress.completed.voice ? ["Y", "C"] : ["_", "_"],
    progress.completed.history ? ["L", "Y"] : ["_", "_"],
  ].flat();
  const rows: (ClueId | "extraction")[] = ["trivia", "voice", "history", "extraction"];

  return (
    <section className="screen">
      <ScreenHeader code="MISSION HUB" title="AGENT STATUS: ACTIVE" />
      <div className="target-bar">
        <span>TARGET</span>
        <strong>SECRET DINNER LOCATION</strong>
        <b>20:45</b>
      </div>
      <div className="cipher-panel">
        <p>ENCRYPTED TARGET DESIGNATION</p>
        <div>{segments.map((letter, index) => <span key={index}>{letter}</span>)}</div>
        <small>{segments.filter((letter) => letter !== "_").length}/6 CHARACTERS RECOVERED</small>
      </div>
      <div className="clue-list">
        {rows.map((id) => {
          const meta = clueMeta[id];
          const completed = id !== "extraction" && progress.completed[id];
          const available = availability[id];
          const lockedReason =
            id !== "trivia" &&
            ((id === "voice" && !progress.completed.trivia) ||
              (id === "history" && !progress.completed.voice) ||
              (id === "extraction" && !progress.completed.history))
              ? "PREVIOUS INTEL REQUIRED"
              : `T-${countdownTo(meta.time, now)}`;
          return (
            <button
              key={id}
              className={`clue-card ${completed ? "complete" : ""} ${available ? "available" : "locked"}`}
              disabled={!available || completed}
              onClick={() => onOpen(id)}
            >
              <span className="clue-number">{completed ? "✓" : meta.icon}</span>
              <span className="clue-copy">
                <small>{meta.time} TRT</small>
                <strong>{meta.title}</strong>
                <em>{meta.subtitle}</em>
              </span>
              <span className="card-status">
                {completed ? "DECRYPTED" : available ? "AVAILABLE →" : lockedReason}
              </span>
            </button>
          );
        })}
      </div>
      {progress.completed.history && !availability.extraction && (
        <p className="all-collected">
          ALL DIGITAL DATA COLLECTED. PROCEED TO SUNSET SPOT FOR PHYSICAL
          EXTRACTION AT 19:30.
        </p>
      )}
      {progress.overrideUsed && <p className="override-notice">EMERGENCY OVERRIDE ACTIVE</p>}
    </section>
  );
}

function VoiceScreen({
  onBack,
  onComplete,
  soundEnabled,
}: {
  onBack: () => void;
  onComplete: () => void;
  soundEnabled: boolean;
}) {
  const [verified, setVerified] = useState([false, false, false]);
  const [active, setActive] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = (index: number) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("VOICE MODULE NOT SUPPORTED BY THIS BROWSER");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "es-ES";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      const score = similarity(result, voicePhrases[index]);
      if (score >= 0.7) {
        tone("success", soundEnabled);
        setVerified((current) => {
          const next = current.map((value, itemIndex) =>
            itemIndex === index ? true : value,
          );
          if (next.every(Boolean)) window.setTimeout(onComplete, 600);
          return next;
        });
        setError("");
      } else {
        tone("error", soundEnabled);
        setError(`MATCH ${Math.round(score * 100)}% — 70% REQUIRED`);
      }
    };
    recognition.onerror = () => {
      setError("VOICE CAPTURE FAILED — CHECK MICROPHONE PERMISSION");
      setActive(null);
    };
    recognition.onend = () => setActive(null);
    recognitionRef.current = recognition;
    setTranscript("");
    setError("");
    setActive(index);
    try {
      recognition.start();
    } catch {
      setError("VOICE MODULE BUSY — TRY AGAIN");
      setActive(null);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  return (
    <section className="screen">
      <ScreenHeader code="CLUE 02" title="VOICE RECOGNITION" onBack={onBack} />
      <div className="voice-console panel">
        <p className="panel-kicker">SPANISH PRONUNCIATION TEST // ES-ES</p>
        <div className={`microphone ${active !== null ? "listening" : ""}`}>◉</div>
        <p className="voice-instruction">
          Hold the control and speak each phrase clearly.
        </p>
        {!supported && <p className="voice-error">VOICE MODULE NOT SUPPORTED. USE EMERGENCY OVERRIDE.</p>}
        <div className="phrase-list">
          {voicePhrases.map((phrase, index) => (
            <div key={phrase} className={verified[index] ? "verified" : ""}>
              <span>{verified[index] ? "✓" : `0${index + 1}`}</span>
              <p>{phrase}</p>
              <button
                type="button"
                disabled={verified[index] || !supported}
                onPointerDown={() => startListening(index)}
                onPointerUp={stopListening}
                onPointerCancel={stopListening}
              >
                {verified[index] ? "VERIFIED" : active === index ? "LISTENING..." : "HOLD TO SPEAK"}
              </button>
            </div>
          ))}
        </div>
        {transcript && <p className="transcript">RECEIVED: “{transcript}”</p>}
        {error && <p className="voice-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function MissionStyles() {
  return (
    <style jsx global>{`
      .mission-root, .mission-body { margin: 0; min-height: 100%; background: #0b0f19 !important; }
      .mission-body { overflow-x: hidden; }
      .mission-shell {
        --green: #00ff88; --gold: #f3b700; --red: #ff4d32; --muted: #758193;
        position: relative; min-height: 100vh; overflow: hidden; color: #e8edf3;
        background: radial-gradient(circle at 50% 0%, #142135 0, #0b0f19 42%, #070a10 100%);
        font-family: var(--font-ibm-plex-mono), ui-monospace, monospace;
      }
      .grid-overlay { position: fixed; inset: 0; pointer-events: none; opacity: .18;
        background-image: linear-gradient(rgba(0,255,136,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,.08) 1px, transparent 1px);
        background-size: 36px 36px; mask-image: linear-gradient(to bottom, black, transparent 78%); }
      .screen { position: relative; z-index: 1; width: min(920px, calc(100% - 32px)); margin: 0 auto; padding: 82px 0 64px; }
      .sound-toggle { position: fixed; z-index: 10; right: 16px; top: 16px; padding: 8px 10px; color: #8a96a7; border: 1px solid #263244; background: rgba(7,10,16,.88); font: 10px inherit; letter-spacing: .12em; }
      button, a { -webkit-tap-highlight-color: transparent; }
      button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
      .eyebrow, .panel-kicker { color: var(--green); font-size: 11px; letter-spacing: .25em; }
      .classification { position: absolute; top: 28px; left: 0; color: var(--red); border: 1px solid var(--red); padding: 7px 10px; font-size: 10px; letter-spacing: .18em; transform: rotate(-2deg); }
      .access-screen { text-align: center; max-width: 760px; }
      .hero-title { font-size: clamp(50px, 11vw, 94px); line-height: .83; letter-spacing: -.06em; margin: 26px 0; color: white; }
      .hero-title span { color: transparent; -webkit-text-stroke: 1px var(--gold); text-shadow: 0 0 30px rgba(243,183,0,.22); }
      .hero-copy { max-width: 590px; margin: 0 auto 35px; color: #98a3b3; font-size: 13px; line-height: 1.8; }
      .code-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
      .code-field { display: flex; flex-direction: column; gap: 8px; padding: 16px 8px; background: rgba(15,22,34,.9); border: 1px solid #253148; color: #8995a6; font-size: 9px; letter-spacing: .08em; }
      .code-icon { font-size: 25px; filter: grayscale(.2); }
      .code-field input { width: 58px; margin: 3px auto 0; border: 0; border-bottom: 1px solid #45536a; background: transparent; color: var(--green); text-align: center; font: 25px inherit; }
      .primary-button, .gold-button { border: 1px solid var(--green); background: rgba(0,255,136,.07); color: var(--green); padding: 15px 18px; font: 700 11px inherit; letter-spacing: .14em; transition: .2s; cursor: pointer; }
      .primary-button:hover { background: var(--green); color: #06110c; box-shadow: 0 0 25px rgba(0,255,136,.25); }
      .primary-button:disabled { opacity: .3; cursor: not-allowed; }
      .code-grid > .primary-button { grid-column: 1 / -1; margin-top: 12px; }
      .error-slot { height: 22px; margin-top: 15px; color: var(--red); font-size: 11px; letter-spacing: .12em; }
      .access-error { animation: shake .32s linear; }
      .access-error::after { content: ""; position: fixed; inset: 0; z-index: 20; pointer-events: none; background: rgba(255,40,20,.12); }
      .mission-header { display: flex; align-items: end; justify-content: space-between; border-bottom: 1px solid #263244; padding-bottom: 20px; margin-bottom: 24px; }
      .mission-header h1 { margin: 7px 0 0; font-size: clamp(22px, 5vw, 36px); letter-spacing: -.03em; }
      .back-button { position: absolute; top: 35px; left: 0; border: 0; background: transparent; color: #758193; font: 10px inherit; letter-spacing: .12em; cursor: pointer; }
      .status-dot { color: var(--green); font-size: 10px; letter-spacing: .15em; }
      .target-bar { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 20px; padding: 14px 18px; border: 1px solid #273449; background: #0d1420; font-size: 11px; }
      .target-bar span { color: var(--red); } .target-bar b { color: var(--gold); font-size: 18px; }
      .cipher-panel { margin: 20px 0; padding: 26px; text-align: center; border: 1px solid #263244; background: linear-gradient(135deg, rgba(0,255,136,.05), transparent); }
      .cipher-panel p, .cipher-panel small { color: #718095; font-size: 9px; letter-spacing: .22em; }
      .cipher-panel div { display: flex; justify-content: center; gap: 11px; margin: 18px 0; }
      .cipher-panel div span { display: grid; place-items: center; width: 45px; height: 54px; border-bottom: 2px solid var(--green); color: var(--green); font-size: 27px; text-shadow: 0 0 15px rgba(0,255,136,.4); }
      .clue-list { display: grid; gap: 10px; }
      .clue-card { width: 100%; display: grid; grid-template-columns: 55px 1fr auto; align-items: center; gap: 15px; padding: 16px; text-align: left; color: white; border: 1px solid #273449; background: rgba(13,20,32,.92); font-family: inherit; transition: .2s; }
      .clue-card.available { cursor: pointer; border-color: rgba(0,255,136,.5); }
      .clue-card.available:hover { transform: translateX(4px); background: rgba(0,255,136,.07); }
      .clue-card.locked { opacity: .46; } .clue-card.complete { border-color: #285b45; }
      .clue-number { display: grid; place-items: center; width: 45px; height: 45px; border: 1px solid #344159; color: var(--green); font-size: 15px; }
      .clue-copy { display: flex; flex-direction: column; gap: 4px; } .clue-copy small { color: var(--gold); font-size: 9px; }
      .clue-copy strong { font-size: 13px; } .clue-copy em { color: #6f7d90; font-size: 9px; font-style: normal; }
      .card-status { color: #718095; font-size: 9px; letter-spacing: .1em; }
      .available .card-status, .complete .card-status { color: var(--green); }
      .all-collected, .override-notice { color: var(--gold); text-align: center; font-size: 10px; line-height: 1.7; letter-spacing: .12em; margin-top: 18px; }
      .override-notice { color: var(--red); }
      .panel { border: 1px solid #283449; background: rgba(11,17,27,.94); padding: clamp(20px, 5vw, 42px); }
      .trivia-form { display: grid; gap: 22px; margin-top: 26px; }
      .trivia-form label span { display: flex; gap: 13px; color: #cbd3de; font-size: 12px; line-height: 1.5; }
      .trivia-form label b { color: var(--green); }
      .trivia-form input, .single-answer input { width: 100%; box-sizing: border-box; margin-top: 9px; padding: 12px 4px; border: 0; border-bottom: 1px solid #344157; background: transparent; color: white; font: 14px inherit; }
      .invalid input { border-color: var(--red); } .invalid em { display: block; margin-top: 6px; color: var(--red); font-size: 9px; font-style: normal; }
      .dossier { position: relative; overflow: hidden; background: radial-gradient(circle at 80% 20%, rgba(243,183,0,.10), transparent 35%), #0d1118; }
      .dossier::before { content: ""; position: absolute; inset: 0; opacity: .12; background: repeating-linear-gradient(15deg, transparent 0 10px, #f3b700 11px, transparent 12px); pointer-events: none; }
      .dossier > * { position: relative; } .dossier h2 { font-size: clamp(28px, 7vw, 53px); margin: 25px 0; color: #e3d8b7; }
      .dossier-stamp { position: absolute; right: 35px; top: 30px; border: 2px solid rgba(255,77,50,.55); color: rgba(255,77,50,.7); padding: 8px; transform: rotate(8deg); font-size: 10px; }
      .riddle { max-width: 690px; color: #a9a18c; font-family: Georgia, serif; font-size: clamp(17px, 3vw, 22px); line-height: 1.8; }
      .single-answer { display: block; margin: 30px 0 18px; color: var(--gold); font-size: 10px; letter-spacing: .15em; }
      .voice-console { text-align: center; }
      .microphone { width: 116px; height: 116px; margin: 28px auto 20px; display: grid; place-items: center; border: 1px solid var(--green); border-radius: 50%; color: var(--green); font-size: 46px; box-shadow: 0 0 0 15px rgba(0,255,136,.03); }
      .microphone.listening { animation: pulse 1s infinite; }
      .voice-instruction { color: #8490a1; font-size: 11px; }
      .phrase-list { display: grid; gap: 10px; margin-top: 30px; text-align: left; }
      .phrase-list > div { display: grid; grid-template-columns: 35px 1fr auto; align-items: center; gap: 12px; border: 1px solid #29364a; padding: 13px; }
      .phrase-list > div > span { color: var(--green); } .phrase-list p { margin: 0; font-size: 12px; }
      .phrase-list button { border: 1px solid #42516a; background: transparent; color: #9da9b9; padding: 9px; font: 9px inherit; cursor: pointer; }
      .phrase-list .verified { border-color: #236143; background: rgba(0,255,136,.05); }
      .phrase-list .verified button { color: var(--green); border-color: var(--green); }
      .transcript, .voice-error { margin-top: 18px; color: var(--green); font-size: 10px; letter-spacing: .08em; }
      .voice-error { color: var(--red); }
      .extraction-screen { text-align: center; max-width: 720px; }
      .extraction-pulse { width: 90px; height: 90px; display: grid; place-items: center; margin: 25px auto; border: 2px solid var(--red); border-radius: 50%; color: var(--red); font-size: 48px; animation: warning 1.5s infinite; }
      .extraction-screen h2 { color: var(--red); font-size: clamp(30px, 7vw, 54px); margin: 18px 0; }
      .extraction-screen > p { color: #919cad; line-height: 1.7; }
      .physical-order { border: 1px solid var(--gold); margin: 30px 0; padding: 24px; color: var(--gold); line-height: 1.8; font-size: 13px; }
      .master-form label { display: block; color: #8995a6; font-size: 11px; }
      .master-form input { display: block; width: 90px; margin: 18px auto; padding: 10px; border: 0; border-bottom: 2px solid var(--gold); background: transparent; color: var(--gold); text-align: center; font: 35px inherit; }
      .master-form > span { display: block; color: var(--red); font-size: 10px; margin-bottom: 12px; }
      .gold-button { border-color: var(--gold); color: var(--gold); background: rgba(243,183,0,.06); }
      .gold-button:hover { background: var(--gold); color: #161000; }
      .success-screen { max-width: 800px; text-align: center; padding-top: 105px; }
      .final-code { display: flex; justify-content: center; gap: clamp(5px, 2vw, 16px); margin: 25px 0 30px; }
      .final-code span { display: grid; place-items: center; width: clamp(42px, 11vw, 80px); height: clamp(60px, 14vw, 100px); border: 1px solid var(--gold); color: var(--gold); background: rgba(243,183,0,.06); font-size: clamp(32px, 8vw, 62px); text-shadow: 0 0 20px rgba(243,183,0,.45); }
      .success-line { width: 90px; height: 1px; background: var(--green); margin: 0 auto 25px; box-shadow: 0 0 12px var(--green); }
      .unlocked-label { color: var(--green); letter-spacing: .3em; font-size: 10px; }
      .success-screen h1 { margin: 12px 0 25px; font-size: clamp(32px, 8vw, 62px); }
      .reservation { display: inline-flex; flex-direction: column; border: 1px solid #334056; padding: 13px 28px; margin-bottom: 25px; color: #788698; font-size: 9px; letter-spacing: .16em; }
      .reservation strong { color: white; font-size: 25px; margin-top: 5px; }
      .map-button { display: block; width: fit-content; margin: 0 auto; text-decoration: none; }
      .final-message { margin-top: 40px; color: #d7cba8; font-family: Georgia, serif; font-style: italic; font-size: 18px; }
      .confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
      .confetti i { --x: calc((var(--i) * 37) % 100); position: absolute; left: calc(var(--x) * 1%); top: -20px; width: 7px; height: 14px; background: var(--gold); animation: fall calc(3s + (var(--i) % 5) * .4s) linear infinite; animation-delay: calc((var(--i) % 9) * -.35s); transform: rotate(calc(var(--i) * 23deg)); }
      .confetti i:nth-child(3n) { background: var(--green); } .confetti i:nth-child(3n+1) { background: var(--red); }
      .secret-override { position: fixed; z-index: 30; right: 0; bottom: 0; width: 28px; height: 28px; opacity: 0; border: 0; }
      .mission-loading { min-height: 100vh; display: grid; place-items: center; background: #0b0f19; color: #00ff88; font: 11px var(--font-ibm-plex-mono), monospace; letter-spacing: .2em; }
      @keyframes shake { 25% { transform: translateX(-8px); } 50% { transform: translateX(8px); } 75% { transform: translateX(-5px); } }
      @keyframes pulse { 50% { box-shadow: 0 0 0 28px rgba(0,255,136,0); transform: scale(1.04); } }
      @keyframes warning { 50% { box-shadow: 0 0 35px rgba(255,77,50,.3); transform: scale(1.05); } }
      @keyframes fall { to { transform: translateY(105vh) rotate(720deg); } }
      @media (max-width: 650px) {
        .screen { width: min(100% - 24px, 920px); padding-top: 78px; }
        .code-grid { grid-template-columns: repeat(2, 1fr); }
        .code-field:last-of-type { grid-column: 1 / -1; }
        .clue-card { grid-template-columns: 42px 1fr; } .card-status { grid-column: 2; }
        .target-bar { gap: 8px; font-size: 9px; } .target-bar b { font-size: 15px; }
        .phrase-list > div { grid-template-columns: 30px 1fr; }
        .phrase-list button { grid-column: 2; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
      }
    `}</style>
  );
}
