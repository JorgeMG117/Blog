import sql from "../../database/db.mjs";
import { WolCommand, WolStatus } from "../../types/api/types";

interface DbCommand {
  id: string;
  action: string;
  created_at: Date;
  expires_at: Date;
  delivered_at: Date | null;
  acked_at: Date | null;
}

const EXPIRE_MINUTES = 5;
// Avoid re-delivering the same command within one poll interval
const REDELIVER_GUARD_SECONDS = 30;

function toWolCommand(row: DbCommand): WolCommand {
  return {
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    deliveredAt: row.delivered_at,
    ackedAt: row.acked_at,
  };
}

export async function createWolCommand(): Promise<WolCommand> {
  const expiresAt = new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000);
  const rows = await sql<DbCommand[]>`
    insert into wol.command (action, expires_at)
    values ('wake', ${expiresAt})
    returning id, action, created_at, expires_at, delivered_at, acked_at
  `;
  return toWolCommand(rows[0]);
}

export async function getActiveWolCommand(): Promise<WolCommand | null> {
  // Find a command that: not expired, not acked, and not delivered in the last REDELIVER_GUARD_SECONDS
  const rows = await sql<DbCommand[]>`
    update wol.command
    set delivered_at = now()
    where id = (
      select id from wol.command
      where expires_at > now()
        and acked_at is null
        and (delivered_at is null or delivered_at < ${new Date(Date.now() - REDELIVER_GUARD_SECONDS * 1000)})
      order by created_at desc
      limit 1
    )
    returning id, action, created_at, expires_at, delivered_at, acked_at
  `;
  if (rows.length === 0) return null;
  return toWolCommand(rows[0]);
}

export async function ackWolCommand(id: string): Promise<WolCommand | null> {
  const rows = await sql<DbCommand[]>`
    update wol.command
    set acked_at = now()
    where id = ${id} and acked_at is null
    returning id, action, created_at, expires_at, delivered_at, acked_at
  `;
  if (rows.length === 0) return null;
  return toWolCommand(rows[0]);
}

export async function getWolStatus(): Promise<WolStatus> {
  const rows = await sql<DbCommand[]>`
    select id, action, created_at, expires_at, delivered_at, acked_at
    from wol.command
    order by created_at desc
    limit 1
  `;
  return { command: rows.length > 0 ? toWolCommand(rows[0]) : null };
}
