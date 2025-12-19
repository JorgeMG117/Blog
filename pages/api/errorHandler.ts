import { NextApiResponse } from "next";

export function handleError(
  res: NextApiResponse,
  err: unknown,
  message: string
): void {
  // In development, show the actual error message
  if (process.env.NODE_ENV !== "production") {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ isSuccess: false, message: errorMessage });
    return;
  }

  res.status(500).json({
    data: null,
    isSuccess: false,
    message: message,
  });
}
