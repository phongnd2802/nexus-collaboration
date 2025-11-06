export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string, stack?: any) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (stack) {
      this.stack = stack;
    }
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export function sendError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }
  return res
    .status(500)
    .json({ code: "INTERNAL_SERVER_ERROR", message: "Unexpected error" });
}

import type { Response } from "express";
