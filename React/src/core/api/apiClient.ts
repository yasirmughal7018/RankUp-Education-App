import { environment } from "@/app/environment";
import type { ApiError, ApiResponse } from "@/core/api/types";

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
};

type AuthHandlers = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
};

let authHandlers: AuthHandlers | null = null;

export function configureApiAuth(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw {
        message: response.statusText || "Request failed",
        status: response.status,
      } satisfies ApiError;
    }

    return undefined as T;
  }

  const payload = (await response.json()) as ApiResponse<T> | ApiError;

  if (!response.ok || ("success" in payload && !payload.success)) {
    throw {
      message:
        ("message" in payload && payload.message) ||
        response.statusText ||
        "Request failed",
      status: response.status,
      errors: "errors" in payload ? payload.errors : undefined,
    } satisfies ApiError;
  }

  if ("data" in payload) {
    return payload.data;
  }

  return payload as T;
}

async function executeRequest(
  path: string,
  options: RequestOptions,
  accessToken?: string | null,
): Promise<Response> {
  const { body, headers, skipAuth, ...rest } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");

  if (!skipAuth && accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${environment.apiBaseUrl}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = options.skipAuth ? null : authHandlers?.getAccessToken();

  let response = await executeRequest(path, options, accessToken);

  const shouldRefresh =
    response.status === 401 &&
    !options.skipAuth &&
    !options.skipAuthRefresh &&
    authHandlers;

  if (shouldRefresh) {
    const refreshedToken = await authHandlers!.refreshAccessToken();

    if (refreshedToken) {
      response = await executeRequest(path, options, refreshedToken);
    }
  }

  return parseResponse<T>(response);
}

export async function apiRequestVoid(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await apiRequest<unknown>(path, options);
}
