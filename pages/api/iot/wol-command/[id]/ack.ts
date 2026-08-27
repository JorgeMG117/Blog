import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { handleError } from "../../../errorHandler";
import {
  fetchWolRelay,
  forwardWolRelayResponse,
} from "../../../../../lib/wol-relay";

function requireBearerToken(req: NextApiRequest, expected: string): boolean {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !expected) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  if (!requireBearerToken(req, process.env.ESP_TOKEN as string)) {
    return res.status(401).json({ isSuccess: false, message: "Unauthorized" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ isSuccess: false, message: "Invalid command id." });
  }

  try {
    const relayResponse = await fetchWolRelay(
      `/commands/${encodeURIComponent(id)}/ack`,
      { method: "POST" },
    );
    await forwardWolRelayResponse(relayResponse, res);
  } catch (error) {
    handleError(res, error, "Failed to acknowledge WoL command.");
  }
}
