export function getOffset(currentPage: number, listPerPage: number): number {
  return (currentPage - 1) * listPerPage;
}

export function emptyOrRows(rows: any[]): any[] {
  if (!rows) {
    return [];
  }
  return rows;
}
export class AppError extends Error {
  statusCode: number;
  details?: Record<string, any>;

  constructor(message: string, statusCode: number, details?: Record<string, any>) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;

      // Maintain proper stack trace
      Error.captureStackTrace(this, this.constructor);
  }
}