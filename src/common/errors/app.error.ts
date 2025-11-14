/**
 * Represents a custom application error with an associated HTTP status code.
 *
 * Allows categorization of errors based on their type (e.g., validation, unauthorized)
 * and automatically assigns the corresponding HTTP status code.
 *
 * The error type (`type`) is mapped to an HTTP status code via the static `typeToCode` object.
 *
 * Available types and their corresponding codes:
 * - `validation` → 400 (Input validation error)
 * - `unauthorized` → 401 (Authentication required)
 * - `forbidden` → 403 (Insufficient permissions)
 * - `server` → 500 (Server error)
 *
 * @extends Error
 */
class AppError extends Error {
  statusCode = 400;
  details?: unknown;

  static typeToCode = {
    validation: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    server: 500,
  };

  constructor(type: keyof typeof AppError.typeToCode, message: string, details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = AppError.typeToCode[type];
    this.details = details;
    Error.captureStackTrace(this);
  }
}

export { AppError };
