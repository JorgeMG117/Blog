import type { InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import Layout from "../components/layout";
import { getMissionControlState } from "../lib/mission-control";
import { MissionControlState, MissionTriviaQuestion } from "../lib/mission";
import type { ApiResponse } from "../types/api/types";

function splitList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[]): string {
  return value.join("\n");
}

export default function MissionControl({
  initialState,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [state, setState] = useState<MissionControlState>(initialState);
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const updateTrivia = (
    index: number,
    patch: Partial<MissionTriviaQuestion>,
  ) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        triviaQuestions: current.config.triviaQuestions.map((question, itemIndex) =>
          itemIndex === index ? { ...question, ...patch } : question,
        ),
      },
    }));
  };

  async function save(nextState = state) {
    setIsSaving(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/mission/admin", {
        method: "PUT",
        body: JSON.stringify(nextState),
      });
      const result = (await response.json()) as ApiResponse<MissionControlState>;

      if (!result.isSuccess || !result.data) {
        setMessage(result.message ?? "Mission control save failed.");
        return;
      }

      setState(result.data);
      setMessage("Mission control saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mission control save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetMission() {
    const nextState = {
      ...state,
      progressVersion: state.progressVersion + 1,
      forcedCompleted: {
        trivia: false,
        voice: false,
        history: false,
        extraction: false,
      },
    };
    setState(nextState);
    void save(nextState);
  }

  return (
    <>
      <Head>
        <title>Mission Control</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Layout isWide={true}>
        <style jsx global>{`
          .mission-control-field { font-size: 16px; min-height: 44px; }
          .mission-control-area { font-size: 16px; }
          .mission-control-action { min-height: 46px; }
          .mission-control-wrap { overflow-wrap: anywhere; }
           (padding: max(0px)) {
            .mission-control-shell { padding-left: max(0px, env(safe-area-inset-left)); padding-right: max(0px, env(safe-area-inset-right)); padding-bottom: max(40px, env(safe-area-inset-bottom)); }
          }
        `}</style>
        <div className="mb-6 flex flex-col gap-2 border-b-2 border-stone-800 pb-4 dark:border-stone-600">
          <h1 className="text-3xl font-semibold">Mission Control</h1>
          <p className="mission-control-wrap text-sm text-stone-600 dark:text-stone-300">
            Player URL: <Link className="text-blue-600 underline dark:text-blue-300" href="/mission">/mission</Link>
          </p>
          <p className="mission-control-wrap text-sm text-stone-600 dark:text-stone-300">
            Progress version: {state.progressVersion}
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-md border border-stone-300 bg-white p-3 text-sm dark:border-stone-600 dark:bg-stone-900">
            {message}
          </div>
        )}

        <div className="mission-control-shell grid gap-6 pb-10">
          <section className="rounded-md border border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-900">
            <h2 className="mb-4 text-xl font-semibold">Access Keys</h2>
            <div className="grid gap-3 md:grid-cols-5">
              {state.config.codes.map((code, index) => (
                <label key={code.id} className="block text-sm">
                  {code.label}
                  <input
                    className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                    value={code.value}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          codes: current.config.codes.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, value: event.target.value.replace(/\D/g, "").slice(0, 2) }
                              : item,
                          ),
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-900">
            <h2 className="mb-4 text-xl font-semibold">Force Correct</h2>
            <div className="grid gap-3 md:grid-cols-4">
              {(["trivia", "voice", "history", "extraction"] as const).map((id) => (
                <label key={id} className="flex items-center gap-2 text-sm capitalize">
                  <input
                    type="checkbox"
                    checked={state.forcedCompleted[id]}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        forcedCompleted: {
                          ...current.forcedCompleted,
                          [id]: event.target.checked,
                        },
                      }))
                    }
                  />
                  {id}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-900">
            <h2 className="mb-4 text-xl font-semibold">Trivia</h2>
            <div className="grid gap-5">
              {state.config.triviaQuestions.map((question, index) => (
                <div key={index} className="grid gap-3 border-b border-stone-200 pb-5 last:border-0 last:pb-0 dark:border-stone-700">
                  <label className="block text-sm">
                    Prompt
                    <input
                      className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                      value={question.prompt}
                      onChange={(event) => updateTrivia(index, { prompt: event.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    Placeholder
                    <input
                      className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                      value={question.placeholder}
                      onChange={(event) => updateTrivia(index, { placeholder: event.target.value })}
                    />
                  </label>
                  {question.durationRange ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-sm">
                        Minimum minutes
                        <input
                          className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                          type="number"
                          value={question.durationRange.minMinutes}
                          onChange={(event) =>
                            updateTrivia(index, {
                              durationRange: {
                                minMinutes: Number(event.target.value),
                                maxMinutes: question.durationRange?.maxMinutes ?? 0,
                              },
                            })
                          }
                        />
                      </label>
                      <label className="block text-sm">
                        Maximum minutes
                        <input
                          className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                          type="number"
                          value={question.durationRange.maxMinutes}
                          onChange={(event) =>
                            updateTrivia(index, {
                              durationRange: {
                                minMinutes: question.durationRange?.minMinutes ?? 0,
                                maxMinutes: Number(event.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="block text-sm">
                      Accepted answers, one per line
                      <textarea
                        className="mission-control-area mt-2 min-h-24 w-full rounded-md dark:bg-stone-800"
                        value={joinList(question.acceptedAnswers)}
                        onChange={(event) =>
                          updateTrivia(index, { acceptedAnswers: splitList(event.target.value) })
                        }
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-900">
            <h2 className="mb-4 text-xl font-semibold">Voice</h2>
            <label className="block text-sm">
              Phrases, one per line
              <textarea
                className="mission-control-area mt-2 min-h-28 w-full rounded-md dark:bg-stone-800"
                value={joinList(state.config.voicePhrases)}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    config: {
                      ...current.config,
                      voicePhrases: splitList(event.target.value),
                    },
                  }))
                }
              />
            </label>
          </section>

          <section className="rounded-md border border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-900">
            <h2 className="mb-4 text-xl font-semibold">History</h2>
            <div className="grid gap-3">
              <label className="block text-sm">
                Title
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.history.title}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        history: { ...current.config.history, title: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Riddle
                <textarea
                  className="mission-control-area mt-2 min-h-24 w-full rounded-md dark:bg-stone-800"
                  value={state.config.history.riddle}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        history: { ...current.config.history, riddle: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Accepted answer
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.history.answer}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        history: { ...current.config.history, answer: event.target.value },
                      },
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-900">
            <h2 className="mb-4 text-xl font-semibold">Extraction And Final Location</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                Instruction
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.extraction.instruction}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        extraction: { ...current.config.extraction, instruction: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Emphasis
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.extraction.emphasis}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        extraction: { ...current.config.extraction, emphasis: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Master key
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.extraction.masterKey}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        extraction: {
                          ...current.config.extraction,
                          masterKey: event.target.value.replace(/\D/g, "").slice(0, 2),
                        },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Restaurant name
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.final.restaurantName}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        final: { ...current.config.final, restaurantName: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Reservation time
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.final.reservationTime}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        final: { ...current.config.final, reservationTime: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Map URL
                <input
                  className="mission-control-field mt-2 w-full rounded-md dark:bg-stone-800"
                  value={state.config.final.mapsUrl}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      config: {
                        ...current.config,
                        final: { ...current.config.final, mapsUrl: event.target.value },
                      },
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              className="mission-control-action rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
              onClick={() => void save()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Mission Control"}
            </button>
            <button
              className="mission-control-action rounded-lg border border-red-500 px-5 py-3 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-stone-800"
              disabled={isSaving}
              onClick={resetMission}
              type="button"
            >
              Reset Mission Progress
            </button>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps = async () => ({
  props: { initialState: await getMissionControlState() },
});
