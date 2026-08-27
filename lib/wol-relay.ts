const relayUrl =
  process.env.WOL_RELAY_URL ??
  "https://blog-wol-relay.jorgemartinezgil117.workers.dev";
const relayToken = process.env.WOL_RELAY_TOKEN ?? process.env.WOL_ADMIN_TOKEN;

export async function fetchWolRelay(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!relayUrl || !relayToken) {
    throw new Error("WoL relay is not configured.");
  }

  return fetch(`${relayUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${relayToken}`,
    },
  });
}

export async function forwardWolRelayResponse(
  relayResponse: Response,
  res: import("next").NextApiResponse,
): Promise<void> {
  if (relayResponse.status === 204) {
    res.status(204).end();
    return;
  }

  const body = await relayResponse.text();
  res
    .status(relayResponse.status)
    .setHeader("Content-Type", relayResponse.headers.get("Content-Type") ?? "application/json")
    .send(body);
}
