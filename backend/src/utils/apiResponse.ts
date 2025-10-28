export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: number;
    details?: unknown;
  };
}

export const success = <T>(data: T): ApiSuccessResponse<T> => ({
  success: true,
  data
});
