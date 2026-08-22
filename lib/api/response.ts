import { NextResponse } from 'next/server';

export interface ApiMeta {
  generated_at: string;
  count: number;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    generated_at: string;
  };
}

/**
 * Creates standardized API success envelope
 */
export function apiSuccess<T>(
  data: T,
  count?: number,
  additionalMeta?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const itemCount = count !== undefined ? count : Array.isArray(data) ? data.length : 1;

  const payload: ApiSuccessResponse<T> = {
    data,
    meta: {
      generated_at: new Date().toISOString(),
      count: itemCount,
      ...additionalMeta,
    },
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      ...headers,
    },
  });
}

/**
 * Creates standardized API error response
 */
export function apiError(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown,
  headers?: Record<string, string>
) {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      details,
    },
    meta: {
      generated_at: new Date().toISOString(),
    },
  };

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
}
