import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { handleError } from "../../../errorHandler";
import { ackWolCommand } from "../../../../../lib/request-handlers/wol-request";

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
    const command = await ackWolCommand(id);
    if (!command) {
      return res.status(404).json({ isSuccess: false, message: "Command not found." });
    }
    return res.status(200).json({ isSuccess: true, message: "Command acknowledged." });
  } catch (error) {
    handleError(res, error, "Failed to acknowledge WoL command.");
  }
}
