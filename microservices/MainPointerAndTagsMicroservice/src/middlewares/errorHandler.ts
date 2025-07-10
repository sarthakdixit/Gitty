import { Request, Response, NextFunction } from "express";
import { ApiError, InternalServerError } from "../errors/apiError";
import { errorResponse } from "../utils/apiResponse";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(
    `[Global Error Handler] Path: ${req.originalUrl}, Error: ${err.message}, Stack: ${err.stack}`
  );

  let statusCode = 500;
  let message = "Internal Server Error";
  let errorCode: string | undefined = "SERVER_ERROR";
  let errorDetails: any;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.constructor.name.replace("Error", "").toUpperCase();
    if ((err as any).error && (err as any).error.details) {
      errorDetails = (err as any).error.details;
    }
  } else if (err.name === "CastError" && (err as any).kind === "ObjectId") {
    statusCode = 400;
    message = `Invalid ID: ${err.message}`;
    errorCode = "INVALID_ID";
  } else if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation Failed";
    errorCode = "VALIDATION_ERROR";
    const errors: { [key: string]: string } = {};
    for (const key in (err as any).errors) {
      errors[key] = (err as any).errors[key].message;
    }
    errorDetails = errors;
  } else if (err.name === "MongoServerError" && (err as any).code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue)[0];
    message = `Duplicate field value: ${field} already exists.`;
    errorCode = "DUPLICATE_KEY";
    errorDetails = { field, value: (err as any).keyValue[field] };
  } else {
    if (req.app.get("env") === "production") {
      message = "An unexpected error occurred.";
      errorCode = "UNEXPECTED_ERROR";
    }
  }

  res.status(statusCode).json(errorResponse(message, errorCode, errorDetails));
};

export default errorHandler;
