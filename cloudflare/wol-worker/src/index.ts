interface Env {
  DB: D1Database;
  RELAY_TOKEN: string;
}

interface CommandRow {
  id: string;
  action: string;
  created_at: string;
  expires_at: string;
  delivered_at: string | null;
  acked_at: string | null;
}

const commandColumns = `
  id, action, created_at, expires_at, delivered_at, acked_at
`;
const redeliveryGuardMs = 30_000;
const expiryMs = 5 * 60_000;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function toCommand(row: CommandRow) {
  return {
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    deliveredAt: row.delivered_at,
    ackedAt: row.acked_at,
  };
}

async function tokensMatch(actual: string, expected: string): Promise<boolean> {
  if (!actual || !expected) return false;

  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return tokensMatch(token, env.RELAY_TOKEN);
}

async function createCommand(env: Env): Promise<Response> {
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + expiryMs);

  await env.DB.prepare(
    `insert into wol_command (
      slot, id, action, created_at, expires_at, delivered_at, acked_at
    ) values (1, ?, 'wake', ?, ?, null, null)
    on conflict (slot) do update set
      id = excluded.id,
      action = excluded.action,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at,
      delivered_at = null,
      acked_at = null`,
  )
    .bind(id, createdAt.toISOString(), expiresAt.toISOString())
    .run();

  return json({
    id,
    action: "wake",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    deliveredAt: null,
    ackedAt: null,
  });
}

async function getCommand(env: Env): Promise<Response> {
  const now = new Date();
  const redeliveryBefore = new Date(now.getTime() - redeliveryGuardMs);
  const row = await env.DB.prepare(
    `select ${commandColumns}
     from wol_command
     where slot = 1
       and expires_at > ?
       and acked_at is null
       and (delivered_at is null or delivered_at < ?)`,
  )
    .bind(now.toISOString(), redeliveryBefore.toISOString())
    .first<CommandRow>();

  if (!row) return new Response(null, { status: 204 });

  const deliveredAt = now.toISOString();
  await env.DB.prepare(
    "update wol_command set delivered_at = ? where slot = 1 and id = ?",
  )
    .bind(deliveredAt, row.id)
    .run();

  return json({ id: row.id, action: row.action });
}

async function acknowledgeCommand(env: Env, id: string): Promise<Response> {
  const result = await env.DB.prepare(
    "update wol_command set acked_at = ? where slot = 1 and id = ? and acked_at is null",
  )
    .bind(new Date().toISOString(), id)
    .run();

  if (result.meta.changes === 0) {
    return json({ isSuccess: false, message: "Command not found." }, 404);
  }
  return json({ isSuccess: true, message: "Command acknowledged." });
}

async function getStatus(env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `select ${commandColumns} from wol_command where slot = 1`,
  ).first<CommandRow>();
  return json({ command: row ? toCommand(row) : null });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!(await isAuthorized(request, env))) {
      return json({ isSuccess: false, message: "Unauthorized" }, 401);
    }

    const { pathname } = new URL(request.url);
    try {
      if (request.method === "POST" && pathname === "/commands") {
        return createCommand(env);
      }
      if (request.method === "GET" && pathname === "/commands/active") {
        return getCommand(env);
      }
      if (request.method === "GET" && pathname === "/commands/status") {
        return getStatus(env);
      }

      const ackMatch = pathname.match(/^\/commands\/([^/]+)\/ack$/);
      if (request.method === "POST" && ackMatch) {
        return acknowledgeCommand(env, decodeURIComponent(ackMatch[1]));
      }
      return json({ isSuccess: false, message: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json({ isSuccess: false, message: "Relay request failed." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
