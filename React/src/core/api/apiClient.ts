/**
 * Shared HTTP client — JSON envelope parsing, auth headers, token refresh.
 */
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

/** Wire token read/refresh handlers used by all authenticated requests. */
export function configureApiAuth(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

function isGenericClientMessage(message: string | undefined): boolean {
  if (!message) {
    return true;
  }

  const normalized = message.trim().toLowerCase();
  return (
    normalized === "validation failed." ||
    normalized === "validation failed" ||
    normalized === "one or more validation errors occurred." ||
    normalized === "something went wrong. please try again." ||
    normalized === "something went wrong" ||
    normalized === "unable to save changes." ||
    normalized === "unable to save changes" ||
    normalized === "request failed"
  );
}

/** Prefer concrete validation errors over a generic envelope message. */
export function resolveApiErrorMessage(payload: {
  message?: string;
  title?: string;
  errors?: string[] | Record<string, string[]> | null;
}): string {
  const rawErrors = payload.errors;
  let errors: string[] = [];
  if (Array.isArray(rawErrors)) {
    errors = rawErrors.filter(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
  } else if (rawErrors && typeof rawErrors === "object") {
    errors = Object.values(rawErrors)
      .flat()
      .filter((item) => typeof item === "string" && item.trim().length > 0);
  }

  const message = payload.message?.trim() || payload.title?.trim();

  if (errors.length > 0 && isGenericClientMessage(message)) {
    return errors.join(" ");
  }

  if (message) {
    return message;
  }

  if (errors.length > 0) {
    return errors.join(" ");
  }

  return "Request failed";
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
    const errors =
      "errors" in payload
        ? (payload as { errors?: string[] | Record<string, string[]> }).errors
        : undefined;

    throw {
      message: resolveApiErrorMessage({
        message: "message" in payload ? payload.message : undefined,
        title:
          "title" in payload && typeof (payload as { title?: string }).title === "string"
            ? (payload as { title: string }).title
            : undefined,
        errors,
      }),
      status: response.status,
      errors: Array.isArray(errors) ? errors : undefined,
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

/** JSON API call with bearer auth and automatic 401 token refresh. */
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

/** Same as apiRequest but ignores the response body. */
export async function apiRequestVoid(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await apiRequest<unknown>(path, options);
}

async function executeFormRequest(
  path: string,
  formData: FormData,
  accessToken?: string | null,
): Promise<Response> {
  const headers = new Headers();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${environment.apiBaseUrl}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
}

/** Multipart upload (do not set Content-Type; browser adds boundary). */
export async function apiRequestForm<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const accessToken = authHandlers?.getAccessToken();
  let response = await executeFormRequest(path, formData, accessToken);

  if (response.status === 401 && authHandlers) {
    const refreshedToken = await authHandlers.refreshAccessToken();
    if (refreshedToken) {
      response = await executeFormRequest(path, formData, refreshedToken);
    }
  }

  return parseResponse<T>(response);
}
