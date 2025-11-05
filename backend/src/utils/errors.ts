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

