import sql from "../database/db.mjs";
import {
  defaultMissionControlState,
  mergeMissionControlState,
  MissionControlState,
} from "./mission";

interface MissionConfigRow {
  config: unknown;
  forced_completed: unknown;
  progress_version: number | string;
  updated_at: Date;
}

async function ensureMissionConfigTable() {
  await sql`create schema if not exists mission`;
  await sql`
    create table if not exists mission.config (
      id integer not null primary key default 1,
      config jsonb not null,
      forced_completed jsonb not null,
      progress_version integer not null,
      updated_at timestamp not null default now(),
      constraint CK_mission_config_singleton check (id = 1)
    )
  `;
}

type SqlJsonValue = Parameters<typeof sql.json>[0];

function toSqlJson(value: unknown): SqlJsonValue {
  return JSON.parse(JSON.stringify(value)) as SqlJsonValue;
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value ?? fallback) as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToState(row: MissionConfigRow): MissionControlState {
  return mergeMissionControlState({
    config: parseJsonValue(row.config, defaultMissionControlState.config),
    forcedCompleted: parseJsonValue(
      row.forced_completed,
      defaultMissionControlState.forcedCompleted,
    ),
    progressVersion: Number(row.progress_version),
    updatedAt: row.updated_at.toISOString(),
  });
}

export async function getMissionControlState(): Promise<MissionControlState> {
  await ensureMissionConfigTable();
  const row = (
    await sql<MissionConfigRow[]>`
      select config, forced_completed, progress_version, updated_at
      from mission.config
      where id = 1
    `
  )[0];

  if (row) return rowToState(row);

  const inserted = (
    await sql<MissionConfigRow[]>`
      insert into mission.config (id, config, forced_completed, progress_version)
      values (
        1,
        ${sql.json(toSqlJson(defaultMissionControlState.config))},
        ${sql.json(toSqlJson(defaultMissionControlState.forcedCompleted))},
        ${defaultMissionControlState.progressVersion}
      )
      returning config, forced_completed, progress_version, updated_at
    `
  )[0];

  return rowToState(inserted);
}

export async function saveMissionControlState(
  state: MissionControlState,
): Promise<MissionControlState> {
  await ensureMissionConfigTable();
  const merged = mergeMissionControlState(state);
  const row = (
    await sql<MissionConfigRow[]>`
      insert into mission.config (id, config, forced_completed, progress_version, updated_at)
      values (
        1,
        ${sql.json(toSqlJson(merged.config))},
        ${sql.json(toSqlJson(merged.forcedCompleted))},
        ${merged.progressVersion},
        now()
      )
      on conflict (id) do update set
        config = excluded.config,
        forced_completed = excluded.forced_completed,
        progress_version = excluded.progress_version,
        updated_at = now()
      returning config, forced_completed, progress_version, updated_at
    `
  )[0];

  return rowToState(row);
}
