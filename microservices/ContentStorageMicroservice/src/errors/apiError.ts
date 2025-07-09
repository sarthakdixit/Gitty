class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(401, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(403, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message: string = "Resource Not Found") {
    super(404, message);
  }
}

class ConflictError extends ApiError {
  constructor(message: string = "Conflict") {
    super(409, message);
  }
}

class UnprocessableEntityError extends ApiError {
  constructor(message: string = "Unprocessable Entity", details?: any) {
    super(422, message);
    if (details) {
      this.error = { details };
    }
  }
  error?: { details?: any };
}

class InternalServerError extends ApiError {
  constructor(
    message: string = "Internal Server Error",
    isOperational: boolean = false
  ) {
    super(500, message, isOperational);
  }
}

export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
};
