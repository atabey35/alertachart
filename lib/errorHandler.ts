/**
 * Error Handler Utility
 * Provides secure error handling for production environments
 * Prevents information disclosure through error messages
 */

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get safe error message for client
 * In production: returns generic message
 * In development: returns detailed error message
 * 
 * @param error Error object or error message
 * @param genericMessage Generic error message for production
 * @returns Safe error message
 */
export function getSafeErrorMessage(
  error: any,
  genericMessage: string = 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
): string {
  if (isProduction()) {
    return genericMessage;
  }
  
  // Development: return detailed error
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return genericMessage;
}

/**
 * Create safe error response for Next.js API routes
 * Prevents information disclosure in production
 * 
 * @param error Error object
 * @param status HTTP status code (default: 500)
 * @param genericMessage Generic error message for production
 * @returns NextResponse with safe error message
 */
export function createSafeErrorResponse(
  error: any,
  status: number = 500,
  genericMessage: string = 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
) {
  const { NextResponse } = require('next/server');
  
  const errorMessage = getSafeErrorMessage(error, genericMessage);
  
  const response: any = {
    error: errorMessage,
  };
  
  // Only include details in development
  if (!isProduction()) {
    if (error instanceof Error) {
      response.details = error.message;
      if ((error as any).code) {
        response.code = (error as any).code;
      }
    } else if (typeof error === 'object' && error !== null) {
      if (error.message) {
        response.details = error.message;
      }
      if (error.code) {
        response.code = error.code;
      }
    }
  }
  
  return NextResponse.json(response, { status });
}
