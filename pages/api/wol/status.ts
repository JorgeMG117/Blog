import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { handleError } from "../errorHandler";
import { getWolStatus } from "../../../lib/request-handlers/wol-request";

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
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  if (!requireBearerToken(req, process.env.WOL_ADMIN_TOKEN as string)) {
    return res.status(401).json({ isSuccess: false, message: "Unauthorized" });
  }

  try {
    const status = await getWolStatus();
    return res.status(200).json({ isSuccess: true, data: status });
  } catch (error) {
    handleError(res, error, "Failed to fetch wake status.");
  }
}
