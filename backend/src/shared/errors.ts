export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export const conflict = (code: string, message: string) => new AppError(code, message, 409);
export const forbidden = () =>
  new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403);
export const notFound = (name: string) => new AppError('NOT_FOUND', `${name} was not found.`, 404);
