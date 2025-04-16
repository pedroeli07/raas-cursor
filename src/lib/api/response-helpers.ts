import { NextResponse } from 'next/server';

// Create a standard error response
export function createErrorResponse(
  message: string,
  status: number = 500,
  errors?: unknown[]
): NextResponse {
  return NextResponse.json(
    { 
      message, 
      errors: errors as { field?: string; message: string }[] 
    }, 
    { status }
  );
} 