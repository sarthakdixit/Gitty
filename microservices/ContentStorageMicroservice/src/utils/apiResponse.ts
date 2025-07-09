import { ApiResponse } from "../interfaces/ApiResponse";

export const successResponse = <T>(
  message: string,
  data?: T
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (
  message: string,
  errorCode?: string,
  errorDetails?: any
): ApiResponse<any> => {
  return {
    success: false,
    message,
    error: {
      code: errorCode,
      details: errorDetails,
    },
  };
};
