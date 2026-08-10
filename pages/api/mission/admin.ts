import type { NextApiRequest, NextApiResponse } from "next";
import {
  getMissionControlState,
  saveMissionControlState,
} from "../../../lib/mission-control";
import { mergeMissionControlState, MissionControlState } from "../../../lib/mission";
import { ApiResponse, parseJsonRequest } from "../../../types/api/types";
import { handleError } from "../errorHandler";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MissionControlState>>,
) {
  try {
    if (req.method === "GET") {
      res.status(200).json({ data: await getMissionControlState(), isSuccess: true });
      return;
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? parseJsonRequest<MissionControlState>(req.body) : req.body;
      res.status(200).json({
        data: await saveMissionControlState(mergeMissionControlState(body)),
        isSuccess: true,
      });
      return;
    }

    res.status(405).json({ isSuccess: false, message: "Method not allowed." });
  } catch (error) {
    handleError(res, error, "An error occurred saving mission config.");
  }
}
