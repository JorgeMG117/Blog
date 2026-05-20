import Head from "next/head";
import { useState, useEffect, useCallback, useRef } from "react";
import { WolCommand } from "../types/api/types";

type Stage = "idle" | "requesting" | "pending" | "delivered" | "acked" | "error";

interface CommandState {
  id: string | null;
  stage: Stage;
  expiresAt: string | null;
  deliveredAt: string | null;
  ackedAt: string | null;
  error: string | null;
}

const STORAGE_KEY = "wol_token";
const POLL_INTERVAL_MS = 5000;

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

function stageToStep(stage: Stage): number {
  const steps: Stage[] = ["requesting", "pending", "delivered", "acked"];
  return steps.indexOf(stage);
}

export default function WolPage() {
  const [token, setToken] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [cmd, setCmd] = useState<CommandState>({
    id: null,
    stage: "idle",
    expiresAt: null,
    deliveredAt: null,
    ackedAt: null,
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [log, setLog] = useState<string[]>(["> system online", "> waiting for command..."]);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-19), `> ${line}`]);
  }, []);

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(
    async (currentToken: string) => {
      try {
        const res = await fetch("/api/wol/status", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        const command: WolCommand | null = body.data?.command ?? null;
        if (!command) return;

        setCmd((prev) => {
          let stage: Stage = prev.stage;

          if (command.ackedAt) {
            stage = "acked";
          } else if (command.deliveredAt) {
            stage = "delivered";
          } else if (command.expiresAt && new Date(command.expiresAt) > new Date()) {
            stage = "pending";
          }

          if (stage === "acked" && prev.stage !== "acked") {
            pushLog("ESP32 acknowledged — WoL packets sent!");
          } else if (stage === "delivered" && prev.stage === "pending") {
            pushLog("ESP32 picked up the command");
          }

          return {
            ...prev,
            id: command.id,
            stage,
            expiresAt: command.expiresAt ? String(command.expiresAt) : null,
            deliveredAt: command.deliveredAt ? String(command.deliveredAt) : null,
            ackedAt: command.ackedAt ? String(command.ackedAt) : null,
          };
        });
      } catch {
        // ignore polling errors silently
      }
    },
    [pushLog]
  );

  const startPolling = useCallback(
    (currentToken: string) => {
      stopPolling();
      pollRef.current = setInterval(() => fetchStatus(currentToken), POLL_INTERVAL_MS);
    },
    [fetchStatus, stopPolling]
  );

  // Clean up polling on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setToken(pinInput.trim());
    localStorage.setItem(STORAGE_KEY, pinInput.trim());
    setPinInput("");
    setPinError(false);
    pushLog("token saved — ready");
  };

  const handleWake = async () => {
    if (!token || cmd.stage === "requesting") return;

    setCmd({ id: null, stage: "requesting", expiresAt: null, deliveredAt: null, ackedAt: null, error: null });
    pushLog("sending wake request...");

    try {
      const res = await fetch("/api/wol/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setPinError(true);
        setCmd((prev) => ({ ...prev, stage: "error", error: "Invalid token — re-enter your PIN" }));
        stopPolling();
        pushLog("ERROR: invalid token");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        setCmd((prev) => ({ ...prev, stage: "error", error: `Request failed: ${res.status}` }));
        pushLog(`ERROR: ${res.status} — ${text.slice(0, 60)}`);
        return;
      }

      const body = await res.json();
      pushLog(`command created [${body.data.id.slice(0, 8)}...]`);
      pushLog("waiting for ESP32 to pick up...");
      setCmd({
        id: body.data.id,
        stage: "pending",
        expiresAt: body.data.expiresAt,
        deliveredAt: null,
        ackedAt: null,
        error: null,
      });
      startPolling(token);
    } catch (err) {
      setCmd((prev) => ({ ...prev, stage: "error", error: "Network error" }));
      pushLog("ERROR: network failure");
    }
  };

  const stageColors: Record<Stage, string> = {
    idle: "text-green-400",
    requesting: "text-yellow-400",
    pending: "text-yellow-400",
    delivered: "text-blue-400",
    acked: "text-green-400",
    error: "text-red-400",
  };

  const buttonGlow: Record<Stage, string> = {
    idle: "shadow-[0_0_20px_4px_rgba(74,222,128,0.4)] hover:shadow-[0_0_36px_8px_rgba(74,222,128,0.6)]",
    requesting: "shadow-[0_0_20px_4px_rgba(250,204,21,0.5)] animate-pulse",
    pending: "shadow-[0_0_20px_4px_rgba(250,204,21,0.5)] animate-pulse",
    delivered: "shadow-[0_0_20px_4px_rgba(96,165,250,0.5)] animate-pulse",
    acked: "shadow-[0_0_36px_12px_rgba(74,222,128,0.7)]",
    error: "shadow-[0_0_20px_4px_rgba(248,113,113,0.5)]",
  };

  const buttonBorder: Record<Stage, string> = {
    idle: "border-green-400",
    requesting: "border-yellow-400",
    pending: "border-yellow-400",
    delivered: "border-blue-400",
    acked: "border-green-400",
    error: "border-red-400",
  };

  const steps = [
    { key: "pending", label: "Requested" },
    { key: "delivered", label: "Delivered to ESP32" },
    { key: "acked", label: "WoL packets sent" },
  ] as const;

  return (
    <>
      <Head>
        <title>Server Control</title>
      </Head>
      <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-center px-4 py-12 select-none">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="text-xs text-green-600 tracking-[0.4em] mb-1">[ JORGE MARTINEZ ]</div>
          <div className="text-2xl font-bold tracking-widest text-green-300">SERVER CONTROL</div>
          <div className="text-xs text-green-700 mt-1">wake-on-lan relay v2.0</div>
        </div>

        {/* PIN gate */}
        {!token && (
          <form
            onSubmit={handlePinSubmit}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <div className="text-sm text-green-600 tracking-widest mb-1">ENTER ACCESS TOKEN</div>
            {pinError && (
              <div className="text-red-400 text-xs tracking-wider">✗ invalid token — try again</div>
            )}
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••••••••••••"
              autoFocus
              className="w-full bg-black border border-green-700 text-green-300 placeholder-green-900 px-4 py-3 text-center tracking-widest focus:outline-none focus:border-green-400 transition-colors"
            />
            <button
              type="submit"
              className="w-full border border-green-600 text-green-400 py-2 tracking-widest hover:bg-green-950 hover:border-green-400 transition-colors text-sm"
            >
              AUTHENTICATE
            </button>
          </form>
        )}

        {/* Main control — shown after auth */}
        {token && (
          <>
            {/* Power button */}
            <div className="flex flex-col items-center mb-12">
              <button
                onClick={handleWake}
                disabled={cmd.stage === "requesting" || cmd.stage === "pending" || cmd.stage === "delivered"}
                className={`
                  w-36 h-36 rounded-full border-4 transition-all duration-300
                  flex items-center justify-center
                  disabled:cursor-not-allowed disabled:opacity-70
                  ${buttonBorder[cmd.stage]}
                  ${buttonGlow[cmd.stage]}
                  bg-black hover:bg-stone-950
                `}
                aria-label="Wake laptop"
              >
                {/* Power icon SVG */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`w-16 h-16 transition-colors duration-300 ${stageColors[cmd.stage]}`}
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
                  />
                </svg>
              </button>
              <div className={`mt-4 text-xs tracking-widest ${stageColors[cmd.stage]}`}>
                {cmd.stage === "idle" && "READY"}
                {cmd.stage === "requesting" && "REQUESTING..."}
                {cmd.stage === "pending" && "WAITING FOR ESP32..."}
                {cmd.stage === "delivered" && "ESP32 SENDING WoL..."}
                {cmd.stage === "acked" && "DONE — WoL SENT ✓"}
                {cmd.stage === "error" && (cmd.error ?? "ERROR")}
              </div>
            </div>

            {/* Timeline */}
            {cmd.stage !== "idle" && cmd.stage !== "requesting" && cmd.stage !== "error" && (
              <div className="w-full max-w-xs mb-10">
                <div className="text-xs text-green-700 tracking-widest mb-3">COMMAND LIFECYCLE</div>
                <div className="flex flex-col gap-3">
                  {steps.map((step, i) => {
                    const currentStep = stageToStep(cmd.stage);
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
                            done ? "bg-green-400" : "bg-green-900"
                          } ${active ? "animate-pulse" : ""}`}
                        />
                        <span
                          className={`text-xs tracking-wide transition-colors duration-500 ${
                            done ? "text-green-300" : "text-green-800"
                          }`}
                        >
                          {step.label}
                        </span>
                        {done && cmd.ackedAt && step.key === "acked" && (
                          <span className="text-green-700 text-xs ml-auto">
                            {timeSince(cmd.ackedAt)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Terminal log */}
            <div className="w-full max-w-xs border border-green-900 bg-stone-950 p-3 text-xs text-green-600 leading-relaxed max-h-40 overflow-y-auto">
              {log.map((line, i) => (
                <div key={i} className={i === log.length - 1 ? "text-green-400" : ""}>
                  {line}
                </div>
              ))}
            </div>

            {/* Lock / change token */}
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setToken(null);
                stopPolling();
                setCmd({ id: null, stage: "idle", expiresAt: null, deliveredAt: null, ackedAt: null, error: null });
                pushLog("token cleared — locked");
              }}
              className="mt-6 text-xs text-green-800 hover:text-green-600 tracking-widest transition-colors"
            >
              [ lock ]
            </button>
          </>
        )}
      </div>
    </>
  );
}
