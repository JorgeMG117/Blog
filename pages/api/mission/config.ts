import type { NextApiRequest, NextApiResponse } from "next";

import { getMissionControlState } from "../../../lib/mission-control";
import { defaultMissionControlState } from "../../../lib/mission";
import { handleError } from "../errorHandler";
import type { ApiResponse } from "../../../types/api/types";
import type { MissionControlState } from "../../../lib/mission";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MissionControlState>>,
) {
  if (req.method !== "GET") {
    res.status(405).json({ isSuccess: false, message: "Method not allowed." });
    return;
  }

  try {
    res.status(200).json({ data: await getMissionControlState(), isSuccess: true });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      handleError(res, error, "An error occurred getting mission config.");
      return;
    }

    res.status(200).json({ data: defaultMissionControlState, isSuccess: true });
  }
}
